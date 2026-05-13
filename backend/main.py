"""
Backend: Binance price oracle + draft storage + scoring + Merkle tree
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

# ─── Top-20 tokens (Binance USDT pairs) ───
TOKENS = [
    "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX",
    "DOT", "MATIC", "LINK", "UNI", "SHIB", "LTC", "ATOM",
    "FIL", "APT", "ARB", "OP", "INJ"
]

BENCHMARK = "BTC"

# ─── DB Init ───
def init_db():
    conn = sqlite3.connect(DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            player TEXT NOT NULL,
            picks TEXT NOT NULL,       -- JSON: [{"symbol":"ETH","direction":"LONG"},...]
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
                    "startTime": timestamp_ms - 60000,  # 1 min before
                    "endTime": timestamp_ms + 60000,    # 1 min after
                    "limit": 1
                }
                resp = await client.get(url, params=params)
                klines = resp.json()
                if klines:
                    prices[sym] = float(klines[0][4])  # close price
            except Exception:
                continue
    return prices


# ─── Scoring ───

async def calculate_scores(
    picks: list[dict], start_prices: dict, end_prices: dict
) -> float:
    """
    Score = average outperformance vs BENCHMARK.
    Each pick: LONG → +growth%, SHORT → -growth%
    Final score = avg(pick_scores) - benchmark_growth
    """
    benchmark_growth = 0.0
    if BENCHMARK in start_prices and BENCHMARK in end_prices:
        benchmark_growth = (end_prices[BENCHMARK] - start_prices[BENCHMARK]) / start_prices[BENCHMARK] * 100

    scores = []
    for pick in picks:
        sym = pick["symbol"]
        direction = pick["direction"]
        if sym not in start_prices or sym not in end_prices:
            continue
        growth = (end_prices[sym] - start_prices[sym]) / start_prices[sym] * 100
        if direction == "SHORT":
            growth = -growth
        scores.append(growth)

    if not scores:
        return 0.0

    avg_score = sum(scores) / len(scores)
    return avg_score - benchmark_growth


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

    # Build tree
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

    # Generate proofs
    proofs = {}
    for idx, (addr, amount) in enumerate(winners):
        proof = []
        current_idx = idx
        for level_idx in range(len(tree) - 1):
            level = tree[level_idx]
            pair_idx = current_idx ^ 1  # sibling
            if pair_idx < len(level):
                proof.append(level[pair_idx])
            current_idx //= 2
        proofs[addr] = proof

    return root, proofs


# ─── API Routes ───

@app.get("/tokens")
async def get_tokens():
    """List available tokens + current prices"""
    prices = await get_prices()
    return {
        "tokens": TOKENS,
        "benchmark": BENCHMARK,
        "prices": prices,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@app.post("/draft")
async def submit_draft(req: DraftRequest):
    """Submit picks for a tournament"""
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
        raise HTTPException(400, "Pick 3-10 tokens")

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
        INSERT OR REPLACE INTO drafts (tournament_id, player, picks, submitted_at)
        VALUES (?, ?, ?, ?)
    """, (req.tournament_id, req.player.lower(), picks_json, datetime.now(timezone.utc).isoformat()))

    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Draft submitted"}


@app.get("/leaderboard/{tournament_id}")
async def get_leaderboard(tournament_id: int):
    """Get current leaderboard (only works if tournament has ended)"""
    conn = sqlite3.connect(DB)
    tour = conn.execute(
        "SELECT * FROM tournaments WHERE id = ?", (tournament_id,)
    ).fetchone()
    if not tour:
        conn.close()
        raise HTTPException(404, "Tournament not found")

    drafts = conn.execute(
        "SELECT player, picks, submitted_at FROM drafts WHERE tournament_id = ?",
        (tournament_id,)
    ).fetchall()
    conn.close()

    # Get prices at start and end
    # For MVP: use current prices mock — in production, store historical prices
    current_prices = await get_prices()

    leaderboard = []
    for player, picks_json, submitted_at in drafts:
        picks = json.loads(picks_json)
        # Mock: use same prices for start/end (in prod we'd use historical)
        score = await calculate_scores(picks, current_prices, current_prices)
        leaderboard.append({
            "player": player,
            "score": round(score, 2),
            "picks": picks
        })

    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    return {
        "tournament_id": tournament_id,
        "players": len(leaderboard),
        "leaderboard": leaderboard[:50]  # top 50
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
    """Calculate results and generate Merkle tree"""
    conn = sqlite3.connect(DB)
    tour = conn.execute(
        "SELECT * FROM tournaments WHERE id = ?", (tournament_id,)
    ).fetchone()
    if not tour:
        conn.close()
        raise HTTPException(404, "Tournament not found")

    drafts = conn.execute(
        "SELECT player, picks FROM drafts WHERE tournament_id = ?",
        (tournament_id,)
    ).fetchall()

    # Use current prices (MVP — in prod, store historical)
    prices = await get_prices()

    # Calculate scores
    results = []
    for player, picks_json in drafts:
        picks = json.loads(picks_json)
        score = await calculate_scores(picks, prices, prices)
        results.append((player, score))

    # Sort by score descending
    results.sort(key=lambda x: x[1], reverse=True)

    # Top 10% get prizes
    prize_count = max(1, len(results) // 10)
    total_pool = tour[6] or 1000000000000000000  # default 1 ETH for MVP
    prize_per_winner = total_pool // prize_count

    winners = []
    for i, (player, score) in enumerate(results[:prize_count]):
        if score > 0:
            amount = int(prize_per_winner)
            winners.append((player, amount))

    # Build Merkle tree
    root_bytes, proofs = build_merkle_tree(winners)
    merkle_root = "0x" + root_bytes.hex()

    # Store
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
        "benchmark": BENCHMARK
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
