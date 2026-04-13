# BoundaryLine — Documentation Index

> All project documentation lives here. Start with `ARCHITECTURE.md` for the 10-minute overview, or `SETUP.md` to run the code locally.

---

## Reading Order

### I want to understand what BoundaryLine is
1. Root [`README.md`](../README.md) — pitch and quick start
2. [`GAME_DESIGN.md`](./GAME_DESIGN.md) — rules, point formula, tiers, strategy
3. [`TOKENOMICS.md`](./TOKENOMICS.md) — BNDY token design

### I want to build / run the code
1. [`SETUP.md`](./SETUP.md) — local environment, wallets, database
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how pieces fit together
3. [`WIREFLUID.md`](./WIREFLUID.md) — chain config, Hardhat/viem setup, why WireFluid
4. [`DATA_MODEL.md`](./DATA_MODEL.md) — database schema
5. [`API.md`](./API.md) — REST endpoints
6. [`CONTRACTS.md`](./CONTRACTS.md) — smart contract specs
7. [`DEPLOYMENT.md`](./DEPLOYMENT.md) — shipping to production

### I want to understand what we trust and why
1. [`SECURITY.md`](./SECURITY.md) — threat model, trust assumptions, incident response
2. [`TOKENOMICS.md`](./TOKENOMICS.md#anti-abuse-guarantees) — anti-abuse mechanisms

### I want to know what's next
1. [`ROADMAP.md`](./ROADMAP.md) — v1 → v2 → v3
2. Root [`PROJECT_TRACKER.md`](../PROJECT_TRACKER.md) — live task state

---

## Document Map

| File | Purpose | Audience |
|---|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System design, data flow, component diagram | Engineers |
| [`WIREFLUID.md`](./WIREFLUID.md) | Chain config, Hardhat/viem setup, finality & gas rationale | Contract + frontend devs |
| [`CONTRACTS.md`](./CONTRACTS.md) | Solidity spec for `PSLPoints` and `PSLTrophies` | Solidity devs, auditors |
| [`TOKENOMICS.md`](./TOKENOMICS.md) | BNDY token design, supply, anti-abuse | Product, legal, devs |
| [`GAME_DESIGN.md`](./GAME_DESIGN.md) | Rules, scoring, tiers, strategic layers | Product, game designers |
| [`API.md`](./API.md) | REST endpoint reference | Frontend devs, integrators |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Postgres schema (Drizzle) | Backend devs |
| [`SETUP.md`](./SETUP.md) | Local dev environment | All contributors |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Vercel + Neon + WireFluid deploy | DevOps, deployers |
| [`SECURITY.md`](./SECURITY.md) | Threat model, trust, incident response | Security reviewers |
| [`ROADMAP.md`](./ROADMAP.md) | v1 / v1.5 / v2 / v3 plans | Everyone |

---

## Key Facts (cheat sheet)

- **Chain**: WireFluid Testnet, chain ID `92533`
- **RPC**: `https://evm.wirefluid.com`
- **Faucet**: `https://faucet.wirefluid.com`
- **Explorer**: `https://wirefluidscan.com`
- **Token**: `BNDY` (BoundaryLine Points), transferable ERC-20
- **Trophy**: `PSLTrophies`, soulbound ERC-721
- **Minimum earned to claim**: 10,000 BNDY
- **Tiers**: Top 50 / Top 25 / Top 10 / Top 3 / Rank 1
- **Claim rule**: one per user per tournament, current tier only

---

## Design Decisions At A Glance

All key decisions are captured in the root [`PROJECT_TRACKER.md`](../PROJECT_TRACKER.md) under **Key Decisions** with rationale and date.

The most important ones:

1. **Transferable ERC-20 + `earnedBalance` tracking** — lets the token trade freely without enabling pay-to-win
2. **Soulbound trophy NFTs** — achievement proof cannot be faked by buying
3. **Dual leaderboard** — off-chain global (engagement) + on-chain prize (authoritative)
4. **Off-chain gameplay, on-chain settlement** — zero gas to play, gas only to sync and claim
5. **Free to play, gas-only** — no entry fees, no tokenized entry, no money handling

---

## Open Questions

Tracked in [`PROJECT_TRACKER.md`](../PROJECT_TRACKER.md) under **Blockers** and **Notes**.

Current open items:
- Final prize list (pending mock images and copy)
- Whether to enable captain multipliers on Day 2 (stretch goal)
- Exact `MIN_EARNED_TO_CLAIM` value to use in demo (currently 10,000 — may tune based on simulated match data)
