"""
Backend: Binance price oracle + draft storage + scoring + Merkle tree
v2: Captain boost (2x weight on selected pick)
"""
import os
import json
import hashlib
import sqlite3
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="Altcoin Fantasy API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB = "fantasy.db"
BINANCE_API = "https://api.binance.com/api/v3"

# ─── Root & Health ───
@app.get("/")
async def root():
    return {"status": "ok", "service": "Altcoin Fantasy API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ─── Top-20 tokens (Binance USDT pairs) ───
TOKENS = [
    "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX",
    "DOT", "MATIC", "LINK", "UNI", "SHIB", "LTC", "ATOM",
    "FIL", "APT", "ARB", "OP", "INJ"
]

BENCHMARK = "BTC"
CAPTAIN_MULTIPLIER = 2  # Matches contract's captainMultiplier

# ─── DB Init ───
def init_db():
    conn = sqlite3.connect(DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            player TEXT NOT NULL,
            picks TEXT NOT NULL,       -- JSON: [{"symbol":"ETH","direction":"LONG"},...]
            captain_index INTEGER DEFAULT 0,  -- which pick (0-2) is captain
            submitted_at TEXT NOT NULL,
            UNIQUE(tournament_id, player)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY,
            draft_deadline TEXT,
            end_time TEXT,
            entry_fee_wei INTEGER,
            finalized INTEGER DEFAULT 0,
            merkle_root TEXT,
            player_count INTEGER DEFAULT 0,
            total_pool_wei INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS results (
            tournament_id INTEGER,
            player TEXT,
            amount_wei INTEGER,
            proof TEXT,
            PRIMARY KEY (tournament_id, player)
        )
    """)
    # Migration: add captain_index if upgrading from v1
    try:
        conn.execute("ALTER TABLE drafts ADD COLUMN captain_index INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # column already exists
    conn.commit()
    conn.close()

init_db()

# ─── Models ───
class DraftPick(BaseModel):
    symbol: str
    direction: str  # "LONG" or "SHORT"

class DraftRequest(BaseModel):
    tournament_id: int
    player: str       # wallet address
    picks: list[DraftPick]
    captain_index: int = 0  # 0, 1, or 2

class TournamentCreate(BaseModel):
    entry_fee_wei: int
    draft_deadline: str   # ISO 8601
    end_time: str

# ─── Binance Price Feed ───

async def get_prices() -> dict[str, float]:
    """Fetch current USDT prices for all tokens from Binance"""
    symbols = '[' + ','.join(f'"{t}USDT"' for t in TOKENS) + ']'
    
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{BINANCE_API}/ticker/price",
            params={"symbols": symbols}
        )
        data = resp.json()

    prices = {}
    for item in data:
        symbol = item["symbol"].replace("USDT", "")
        prices[symbol] = float(item["price"])
    return prices


async def get_historical_prices(
    symbols: list[str], timestamp_ms: int
) -> dict[str, float]:
    """Get prices at a specific timestamp using klines"""
    prices = {}
    async with httpx.AsyncClient(timeout=30) as client:
        for sym in symbols:
            try:
                url = f"{BINANCE_API}/klines"
                params = {
                    "symbol": f"{sym}USDT",
                    "interval": "1m",
                    "startTime": timestamp_ms - 60000,
                    "endTime": timestamp_ms + 60000,
                    "limit": 1
                }
                resp = await client.get(url, params=params)
                klines = resp.json()
                if klines:
                    prices[sym] = float(klines[0][4])  # close price
            except Exception:
                continue
    return prices


# ─── Scoring (with Captain Boost) ───

async def calculate_scores(
    picks: list[dict], start_prices: dict, end_prices: dict,
    captain_index: int = 0
) -> float:
    """
    Score = weighted average outperformance vs BENCHMARK.
    Captain pick gets CAPTAIN_MULTIPLIER (2x) weight.
    Each pick: LONG → +growth%, SHORT → -growth%
    
    With 3 picks and captain at index i:
      weight_per_pick = [1, 1, 1], but captain gets 2
      total_weight = 1+1+2 = 4
      weighted_score = sum(score[i] * weight[i]) / total_weight
      final = weighted_score - benchmark_growth
    """
    benchmark_growth = 0.0
    if BENCHMARK in start_prices and BENCHMARK in end_prices:
        benchmark_growth = (end_prices[BENCHMARK] - start_prices[BENCHMARK]) / start_prices[BENCHMARK] * 100

    scores = []
    weights = []
    for i, pick in enumerate(picks):
        sym = pick["symbol"]
        direction = pick["direction"]
        if sym not in start_prices or sym not in end_prices:
            continue
        growth = (end_prices[sym] - start_prices[sym]) / start_prices[sym] * 100
        if direction == "SHORT":
            growth = -growth
        
        weight = CAPTAIN_MULTIPLIER if i == captain_index else 1
        scores.append(growth * weight)
        weights.append(weight)

    if not scores or sum(weights) == 0:
        return 0.0

    weighted_avg = sum(scores) / sum(weights)
    return weighted_avg - benchmark_growth


# ─── Merkle Tree ───

def build_merkle_tree(winners: list[tuple[str, int]]) -> tuple[bytes, dict]:
    """
    Build Merkle tree from (address, amount_wei) pairs.
    Returns (root, {address: proof})
    """
    if not winners:
        return bytes(32), {}

    leaves = []
    for addr, amount in winners:
        leaf = hashlib.sha256(
            addr.encode() + amount.to_bytes(32, 'big')
        ).digest()
        leaves.append(leaf)

    tree = [leaves]
    while len(tree[-1]) > 1:
        level = tree[-1]
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left
            combined = hashlib.sha256(left + right).digest()
            next_level.append(combined)
        tree.append(next_level)

    root = tree[-1][0] if tree[-1] else bytes(32)

    proofs = {}
    for idx, (addr, amount) in enumerate(winners):
        proof = []
        current_idx = idx
        for level_idx in range(len(tree) - 1):
            level = tree[level_idx]
            pair_idx = current_idx ^ 1
            if pair_idx < len(level):
                proof.append(level[pair_idx])
            current_idx //= 2
        proofs[addr] = proof

    return root, proofs


# ─── API Routes ───

@app.get("/tokens")
async def get_tokens():
    """List available tokens + current prices"""
    try:
        prices = await get_prices()
    except Exception:
        prices = {}  # Binance blocked or network error — return empty
    return {
        "tokens": TOKENS,
        "benchmark": BENCHMARK,
        "prices": prices,
        "captain_multiplier": CAPTAIN_MULTIPLIER,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@app.post("/draft")
async def submit_draft(req: DraftRequest):
    """Submit picks for a tournament (with captain)"""
    conn = sqlite3.connect(DB)

    # Check tournament exists & draft is open
    tour = conn.execute(
        "SELECT draft_deadline, finalized FROM tournaments WHERE id = ?",
        (req.tournament_id,)
    ).fetchone()
    if not tour:
        conn.close()
        raise HTTPException(404, "Tournament not found")

    draft_deadline = datetime.fromisoformat(tour[0])
    if datetime.now(timezone.utc) > draft_deadline:
        conn.close()
        raise HTTPException(400, "Draft deadline passed")

    if tour[1]:
        conn.close()
        raise HTTPException(400, "Tournament finalized")

    # Validate picks
    if len(req.picks) != 3:
        conn.close()
        raise HTTPException(400, "Must pick exactly 3 tokens")

    if req.captain_index < 0 or req.captain_index > 2:
        conn.close()
        raise HTTPException(400, "Captain index must be 0-2")

    for pick in req.picks:
        if pick.symbol not in TOKENS:
            conn.close()
            raise HTTPException(400, f"Unknown token: {pick.symbol}")
        if pick.direction not in ("LONG", "SHORT"):
            conn.close()
            raise HTTPException(400, f"Invalid direction: {pick.direction}")

    picks_json = json.dumps([p.model_dump() for p in req.picks])

    # Upsert
    conn.execute("""
        INSERT OR REPLACE INTO drafts (tournament_id, player, picks, captain_index, submitted_at)
        VALUES (?, ?, ?, ?, ?)
    """, (req.tournament_id, req.player.lower(), picks_json, req.captain_index, datetime.now(timezone.utc).isoformat()))

    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Draft submitted", "captain_index": req.captain_index}


@app.get("/leaderboard/{tournament_id}")
async def get_leaderboard(tournament_id: int):
    """Get current leaderboard with captain-adjusted scores"""
    conn = sqlite3.connect(DB)
    tour = conn.execute(
        "SELECT * FROM tournaments WHERE id = ?", (tournament_id,)
    ).fetchone()
    if not tour:
        conn.close()
        raise HTTPException(404, "Tournament not found")

    drafts = conn.execute(
        "SELECT player, picks, captain_index, submitted_at FROM drafts WHERE tournament_id = ?",
        (tournament_id,)
    ).fetchall()
    conn.close()

    try:
        current_prices = await get_prices()
    except Exception:
        current_prices = {}  # Binance blocked

    leaderboard = []
    for player, picks_json, captain_index, submitted_at in drafts:
        picks = json.loads(picks_json)
        score = await calculate_scores(picks, current_prices, current_prices, captain_index or 0)
        leaderboard.append({
            "player": player,
            "score": round(score, 2),
            "picks": picks,
            "captain_index": captain_index or 0
        })

    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    return {
        "tournament_id": tournament_id,
        "players": len(leaderboard),
        "leaderboard": leaderboard[:50]
    }


@app.post("/tournament")
async def create_tournament(req: TournamentCreate):
    """Create new tournament (admin only for MVP)"""
    conn = sqlite3.connect(DB)
    tour_id = conn.execute(
        "SELECT COALESCE(MAX(id), 0) + 1 FROM tournaments"
    ).fetchone()[0]

    conn.execute("""
        INSERT INTO tournaments (id, draft_deadline, end_time, entry_fee_wei)
        VALUES (?, ?, ?, ?)
    """, (tour_id, req.draft_deadline, req.end_time, req.entry_fee_wei))
    conn.commit()
    conn.close()
    return {"tournament_id": tour_id, "status": "created"}


@app.post("/finalize/{tournament_id}")
async def finalize_tournament(tournament_id: int):
    """Calculate results with captain boost and generate Merkle tree"""
    conn = sqlite3.connect(DB)
    tour = conn.execute(
        "SELECT * FROM tournaments WHERE id = ?", (tournament_id,)
    ).fetchone()
    if not tour:
        conn.close()
        raise HTTPException(404, "Tournament not found")

    drafts = conn.execute(
        "SELECT player, picks, captain_index FROM drafts WHERE tournament_id = ?",
        (tournament_id,)
    ).fetchall()

    prices = await get_prices()

    results = []
    for player, picks_json, captain_index in drafts:
        picks = json.loads(picks_json)
        score = await calculate_scores(picks, prices, prices, captain_index or 0)
        results.append((player, score))

    results.sort(key=lambda x: x[1], reverse=True)

    prize_count = max(1, len(results) // 10)
    total_pool = tour[6] or 1000000000000000000
    prize_per_winner = total_pool // prize_count

    winners = []
    for i, (player, score) in enumerate(results[:prize_count]):
        if score > 0:
            amount = int(prize_per_winner)
            winners.append((player, amount))

    root_bytes, proofs = build_merkle_tree(winners)
    merkle_root = "0x" + root_bytes.hex()

    for player, amount in winners:
        proof_hex = ["0x" + p.hex() for p in proofs.get(player, [])]
        conn.execute("""
            INSERT OR REPLACE INTO results (tournament_id, player, amount_wei, proof)
            VALUES (?, ?, ?, ?)
        """, (tournament_id, player, amount, json.dumps(proof_hex)))

    conn.execute("""
        UPDATE tournaments SET finalized = 1, merkle_root = ?
        WHERE id = ?
    """, (merkle_root, tournament_id))
    conn.commit()
    conn.close()

    return {
        "tournament_id": tournament_id,
        "merkle_root": merkle_root,
        "winners": len(winners),
        "prize_per_winner_wei": prize_per_winner
    }


@app.get("/health")
async def health():
    prices = await get_prices()
    return {
        "status": "ok",
        "tokens_tracked": len(prices),
        "benchmark": BENCHMARK,
        "captain_multiplier": CAPTAIN_MULTIPLIER
    }


# ═══════════════════════════════════════════
# MechLeague v4: Battle Simulator Endpoints
# ═══════════════════════════════════════════

from simulator import simulate_battle, TOKENS

# CoinGecko token IDs
COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum", 
    "SOL": "solana",
    "LINK": "chainlink",
    "AVAX": "avalanche-2",
}


@app.get("/prices")
async def get_prices():
    """Get token prices with 24h change % — powers ability modulation."""
    try:
        ids = ",".join(COINGECKO_IDS.values())
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://api.coingecko.com/api/v3/simple/price",
                params={"ids": ids, "vs_currencies": "usd", "include_24hr_change": "true"}
            )
            if r.status_code != 200:
                raise HTTPException(502, "CoinGecko unavailable")

            data = r.json()
            prices = {}
            for symbol, cg_id in COINGECKO_IDS.items():
                coin = data.get(cg_id, {})
                prices[symbol] = {
                    "usd": coin.get("usd", 0),
                    "change_24h": round(coin.get("usd_24h_change", 0), 2),
                }
            return {"status": "ok", "prices": prices}
    except Exception as e:
        raise HTTPException(502, f"Price fetch failed: {e}")


class BattleRequest(BaseModel):
    mechA_id: int
    mechA_tokens: list[int]  # 6 token IDs (0-4)
    mechA_captain: int       # 0-5
    mechB_id: int
    mechB_tokens: list[int]
    mechB_captain: int


@app.post("/battle/simulate")
async def simulate(req: BattleRequest):
    """Simulate a battle between two mechs. Returns full event log for animation."""
    # Validate inputs
    if len(req.mechA_tokens) != 6 or len(req.mechB_tokens) != 6:
        raise HTTPException(400, "Each mech needs exactly 6 token IDs")
    if not (0 <= req.mechA_captain < 6) or not (0 <= req.mechB_captain < 6):
        raise HTTPException(400, "Captain index must be 0-5")
    for t in req.mechA_tokens + req.mechB_tokens:
        if t not in TOKENS:
            raise HTTPException(400, f"Unknown token ID: {t}")

    # Get live prices for ability modulation
    try:
        price_data = await get_prices()
        prices_24h = {s: d["change_24h"] for s, d in price_data["prices"].items()}
    except:
        # Fallback to flat prices if CoinGecko is down
        prices_24h = {s: 0.0 for s in COINGECKO_IDS}

    # Run simulation
    result = simulate_battle(
        mechA_id=req.mechA_id,
        mechA_tokens=req.mechA_tokens,
        mechA_captain=req.mechA_captain,
        mechB_id=req.mechB_id,
        mechB_tokens=req.mechB_tokens,
        mechB_captain=req.mechB_captain,
        prices=prices_24h,
    )

    return {
        "winner": result.winner,
        "mechA_hp_final": result.mechA_hp_final,
        "mechB_hp_final": result.mechB_hp_final,
        "mechA_max_hp": 500,
        "mechB_max_hp": 500,
        "events": [
            {
                "tick": e.tick,
                "time": round(e.tick * 0.5, 1),
                "actor": e.actor,
                "slot": e.slot,
                "ability_name": e.ability_name,
                "icon": e.icon,
                "damage": e.damage,
                "shielded": e.shielded,
                "dodged": e.dodged,
                "crit": e.crit,
                "effect": e.effect,
                "mechA_hp": e.mechA_hp,
                "mechB_hp": e.mechB_hp,
            }
            for e in result.events
        ],
        "mechA_powers": result.mechA_stats["powers"],
        "mechB_powers": result.mechB_stats["powers"],
        "seed": result.seed,
        "prices_24h": prices_24h,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
