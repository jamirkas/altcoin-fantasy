# Altcoin Fantasy — MVP

Weekly crypto fantasy league. Draft altcoins, beat Bitcoin, win prizes.

## Stack

| Layer | Tech |
|-------|------|
| Contract | Solidity (Base Sepolia) |
| Backend | FastAPI + Binance API |
| Frontend | Next.js + ethers.js + Tailwind |
| Wallet | MetaMask / Rabby / Coinbase Wallet |

## What's built

```
altcoin-fantasy/
├── contracts/FantasyLeague.sol  # Tournament entry + Merkle prize claims
├── backend/main.py               # Binance oracle, scoring, draft storage
├── frontend/src/app/
│   ├── page.tsx                  # Main dApp (draft + leaderboard)
│   └── layout.tsx
├── deploy.js                     # Deploy contract + create tournament
└── vercel.json                   # Vercel config
```

## How it works

1. User pays 0.001 ETH → enters tournament (mints entry on-chain)
2. User picks 3-10 altcoins (LONG/SHORT) → submits draft to API
3. Draft deadline passes → picks locked
4. Tournament ends → backend calculates scores (outperformance vs BTC)
5. Admin posts Merkle root → winners claim ETH via Merkle proof

## Quick Start

### 1. Start Backend
```bash
cd backend
pip install fastapi uvicorn httpx
python3 main.py  # → http://localhost:8000
```

### 2. Deploy Contract (Base Sepolia)
```bash
# Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia
node deploy.js <YOUR_PRIVATE_KEY>
```
This will:
- Compile & deploy FantasyLeague.sol
- Create Tournament #1 (24h deadline, 7d duration)
- Save CONTRACT_ADDRESS to `frontend/src/app/contract.ts`

### 3. Update Frontend
Edit `frontend/src/app/page.tsx`:
- Replace `CONTRACT_ADDRESS` with deployed address
- Replace `API_URL` with your backend URL

### 4. Deploy Frontend (Vercel)
```bash
# One-time:
# Go to https://vercel.com → Import GitHub repo → jamirkas/altcoin-fantasy
# Set ROOT DIRECTORY to "frontend"

# Or via CLI:
cd frontend && npx vercel --prod
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tokens` | Top-20 tokens + live Binance prices |
| POST | `/draft` | Submit draft picks |
| GET | `/leaderboard/:id` | Tournament leaderboard |
| POST | `/finalize/:id` | Calculate results, build Merkle tree |

## Contract Address (to deploy)

```solidity
// Base Sepolia Testnet
// Deploy with: node deploy.js <PRIVATE_KEY>
```

## Top-20 Tokens (MVP)

BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, DOT, MATIC,
LINK, UNI, SHIB, LTC, ATOM, FIL, APT, ARB, OP, INJ
