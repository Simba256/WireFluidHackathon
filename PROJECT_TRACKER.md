# Project Tracker

> Last updated: 2026-04-13 (22:42 PKT)

## Project Summary
BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status
**Status**: Active — Design Phase Complete, Ready to Build

## In Progress
- [ ] Provision Neon Postgres + run `db:push` + `db:seed` against live branch

## Recently Completed
- [x] Shared package authored — viem `defineChain` for WireFluid (92533), explorer URL helpers, deployed contract addresses + trusted signer constants, inlined `PSLPoints`/`PSLTrophies` ABIs (`as const` for viem inference), EIP-712 domain + `SyncVoucher`/`ClaimVoucher` typed-data structs, full DTO surface (User/Player/Team/Match/Score/Points/Leaderboards/Prize/Claim/Trophy), `ApiError` + error code catalog matching `docs/API.md`, game constants (SALARY_CAP, TEAM_SIZE, MIN_EARNED_TO_CLAIM_WEI, point formula multipliers, tier definitions + `tierForRank` helper), wallet normalize/validate (Zod), tsconfig + `@types/node`; typecheck clean — (2026-04-13)
- [x] Database package authored — Drizzle schema for all 13 tables with wallet CHECK constraints, partial unique on active claims, leaderboard indexes; migration `0000_stormy_raza.sql` generated; query helpers (point formula, global rank, tier stock); seed runner + `data/psl-2026-players.json` (150 players) + `data/prizes.json` (5 tiers); typecheck clean — (2026-04-13)
- [x] Contracts deployed + verified on WireFluid testnet — PSLPoints `0x785FAE9B...abBc`, PSLTrophies `0x6F42EC72...24F7`, setTrophies wired. Deployment JSON + DEMO_TRANSACTIONS.md updated, source verified on wirefluidscan — (2026-04-13)
- [x] Slither static analysis — project-local `.venv` (slither 0.11.5), zero findings across all severities — (2026-04-13)
- [x] Contract test suite — 24 passing, 100% stmts/funcs/lines, 84% branches. Covers sync/claim happy + revert paths, earnedBalance isolation, gifted-balance burn, trophy cross-mint, soulbound enforcement, setTrophies one-shot — (2026-04-13)
- [x] `PSLTrophies.sol` — soulbound ERC-721, immutable minter, inline-SVG tokenURI, `_update` blocks transfers, tier/tournament tagging — (2026-04-13)
- [x] `PSLPoints.sol` — ERC-20 BNDY, EIP-712 sync/claim vouchers, earnedBalance gating, one-shot setTrophies, compiles + solhint clean — (2026-04-13)
- [x] Hardhat scaffold for `packages/contracts` — config, .env.example, solhint, slither, deploy stub, OZ v5 installed, compile green — (2026-04-13)
- [x] Final design lock: transferable ERC-20 + earned-balance tracking + soulbound trophies + dual leaderboard — (2026-04-13)
- [x] WireFluid platform research (chain ID 92533, RPC, faucet, explorer) — (2026-04-13)
- [x] Scope negotiation (dropped: P2P point exchange, ERC-20 soulbound, fixed-price prize catalog) — (2026-04-13)

## Upcoming / Planned
- [ ] Provision Neon Postgres + run `db:push` + `db:seed` against live branch — P0
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
