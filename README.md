# BoundaryLine

> Free-to-play fantasy PSL on WireFluid. Pick your 11, earn points from real matches, climb the on-chain leaderboard, claim real prizes as permanent trophy NFTs.

**Built for the WireFluid Hackathon — April 2026.**

---

## The Pitch

Millions of Pakistanis follow PSL. Existing fantasy cricket apps gatekeep prizes behind entry fees and store scores in opaque databases. **BoundaryLine flips the model**:

- **Free to play** — no entry fees, ever. The only cost is a few cents of gas when you claim.
- **On-chain prize distribution** — the prize leaderboard lives on WireFluid. Anyone can verify who won.
- **Real-world rewards** — top-ranked players claim signed gear, tickets, and merch. No tokenized shortcuts.
- **Permanent achievements** — winners receive soulbound trophy NFTs in their wallet. Proof of victory, forever.

---

## How It Works

1. **Connect your wallet** using Sign-In With Ethereum (SIWE).
2. **Pick your 11 players** from the PSL 2026 squads under a salary cap.
3. **Earn points** as real matches play out — runs, wickets, catches all count.
4. **Sync your points** to your wallet when you're ready to compete on the prize leaderboard (small gas fee).
5. **Claim your tier** when your on-chain rank hits Top 50, Top 25, Top 10, Top 3, or Rank 1 — burn your tokens, mint a trophy NFT, receive your real prize.

**One claim per player per tournament. Pick your moment.**

---

## Quick Start (Developers)

```bash
# Prerequisites: Node 20+, pnpm 9+, a WireFluid testnet wallet with faucet WIRE
git clone <repo-url> boundaryline && cd boundaryline
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL, signer private key, etc.
pnpm db:push                 # push Drizzle schema to Neon
pnpm db:seed                 # load PSL 2026 player data
pnpm --filter contracts deploy:testnet
pnpm dev                     # Next.js on http://localhost:3000
```

See [`docs/SETUP.md`](./docs/SETUP.md) for full environment setup and [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for Vercel + WireFluid testnet deployment.

---

## Repository Layout

```
boundaryline/
├── apps/
│   └── web/                  # Next.js 15 App Router (frontend + API routes)
├── packages/
│   ├── contracts/            # Hardhat — PSLPoints.sol, PSLTrophies.sol
│   ├── db/                   # Drizzle schema + migrations + seed data
│   └── shared/               # ABIs, types, chain config, constants
├── data/
│   └── psl-2026-players.json # Seed data for player picker
├── docs/                     # Full project documentation
└── README.md
```

---

## Documentation

All project documentation lives in [`docs/`](./docs):

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — system design, data flow, component diagram
- **[CONTRACTS.md](./docs/CONTRACTS.md)** — `PSLPoints` and `PSLTrophies` specifications
- **[TOKENOMICS.md](./docs/TOKENOMICS.md)** — BNDY token design, supply, sinks, anti-abuse
- **[GAME_DESIGN.md](./docs/GAME_DESIGN.md)** — point formula, tiers, strategic mechanics
- **[API.md](./docs/API.md)** — REST endpoints and request/response schemas
- **[DATA_MODEL.md](./docs/DATA_MODEL.md)** — Drizzle schema, relationships, indexes
- **[SETUP.md](./docs/SETUP.md)** — local development environment
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — production deployment to Vercel + WireFluid
- **[SECURITY.md](./docs/SECURITY.md)** — threat model, trust assumptions, known limits
- **[ROADMAP.md](./docs/ROADMAP.md)** — post-hackathon v2 plans

---

## Tech Stack

| Layer | Tech |
|---|---|
| Blockchain | WireFluid testnet (EVM + CometBFT, chain ID `92533`) |
| Contracts | Solidity 0.8.24 + OpenZeppelin + Hardhat + TypeScript |
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui + Framer Motion |
| Wallet | wagmi v2 + viem + RainbowKit + SIWE |
| Backend | Next.js API routes + EIP-712 voucher signer |
| Database | Neon Postgres + Drizzle ORM |
| Deploy | Vercel (Fluid Compute) |

---

## For Judges

- **Live transaction log**: [`docs/DEMO_TRANSACTIONS.md`](./docs/DEMO_TRANSACTIONS.md) — every on-chain tx (deploys, syncs, claims, trophy mints) with hashes and explorer links
- **Network**: WireFluid Testnet, chain ID `92533`, explorer `https://wirefluidscan.com`

## Links

- **Live demo**: TBD
- **Contracts on explorer**: TBD (see `docs/DEMO_TRANSACTIONS.md`)
- **Pitch deck**: `docs/pitch-deck.pdf` (added before demo)
- **Demo video**: TBD

---

## License

MIT
