# Project Tracker

> Last updated: 2026-04-13

## Project Summary
BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status
**Status**: Active — Design Phase Complete, Ready to Build

## In Progress
- [ ] Project documentation authoring — `docs/*` (design locked, drafting specs)

## Recently Completed
- [x] Final design lock: transferable ERC-20 + earned-balance tracking + soulbound trophies + dual leaderboard — (2026-04-13)
- [x] WireFluid platform research (chain ID 92533, RPC, faucet, explorer) — (2026-04-13)
- [x] Scope negotiation (dropped: P2P point exchange, ERC-20 soulbound, fixed-price prize catalog) — (2026-04-13)

## Upcoming / Planned
- [ ] Monorepo scaffold (pnpm + Turborepo + Next.js + Hardhat) — P0
- [ ] Deploy `PSLPoints.sol` + `PSLTrophies.sol` to WireFluid testnet — P0
- [ ] Neon Postgres + Drizzle schema + seed PSL 2026 player data — P0
- [ ] SIWE auth + team picker UI — P0
- [ ] Scoring engine + global leaderboard — P0
- [ ] Sync flow (off-chain points → on-chain `earnedBalance`) — P0
- [ ] Prize leaderboard (on-chain read via multicall) — P0
- [ ] Claim flow with EIP-712 vouchers — P0
- [ ] Trophy showcase page — P1
- [ ] Demo video + pitch deck + README polish — P0

## Blockers
- None

## Key Decisions
- (2026-04-13) **Transferable ERC-20 with `earnedBalance` tracking** — rationale: user wanted tradability and secondary market, but pay-to-win must be blocked. Solution: prize eligibility reads from monotonic `earnedBalance` which only increments on mint (play), not on transfer.
- (2026-04-13) **Soulbound trophy NFTs** — rationale: trophies represent achievement proof, must not be buyable/tradeable, otherwise anyone could fake "Top 10 Finisher" status.
- (2026-04-13) **Dual leaderboard (global off-chain + prize on-chain)** — rationale: off-chain for engagement/inclusivity, on-chain for authoritative prize distribution. Only prize leaderboard determines winners.
- (2026-04-13) **Minimum 10,000 BNDY earned to claim any prize** — rationale: raises cost of Sybil/low-effort claim attacks, forces meaningful gameplay.
- (2026-04-13) **One claim per user per tournament, current-tier-only** — rationale: creates press-your-luck strategic tension; prevents downgrade exploits.
- (2026-04-13) **Off-chain point accumulation, on-chain sync opt-in** — rationale: zero gas for gameplay, on-chain only where trust/prizes require it.
- (2026-04-13) **Free-to-play, gas-only costs** — rationale: no entry fees, avoids gambling classification, reduces legal/regulatory risk.

## Notes
- WireFluid Testnet: Chain ID `92533`, RPC `https://evm.wirefluid.com`, Faucet `https://faucet.wirefluid.com`, Explorer `https://wirefluidscan.com`
- Hackathon scope: 2 days, 3 devs, solo-track deployable demo
- Prizes for demo are mocked (representative) — real partnerships are v2
- v2 roadmap items recorded in `docs/ROADMAP.md`
