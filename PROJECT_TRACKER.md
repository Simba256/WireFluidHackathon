# Project Tracker

> Last updated: 2026-04-14 (01:05 PKT)

## Project Summary
BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status
**Status**: Active — Design Phase Complete, Ready to Build

## In Progress
- [ ] Players & teams API routes (`/api/players`, `/api/teams`, `/api/teams/me`)

## Recently Completed
- [x] Next.js 16 app scaffolded + SIWE auth shipped — `apps/web` now has `next.config.ts`, Tailwind/PostCSS config, root layout + landing page, and a working auth stack. Built `lib/env.ts` (Zod-validated server env), `lib/errors.ts` (`{error,code}` helpers matching `API_ERROR_CODES`), `lib/jwt.ts` (jose HS256, 7d TTL, jti), `lib/session-blacklist.ts` (in-memory revoke), `lib/auth.ts` (`requireAuth` Bearer helper), `lib/siwe.ts` (siwe v2 verify w/ chain-id check), `lib/db.ts` (drizzle via shared env). Routes: `GET /api/auth/nonce` (issues + sets httpOnly nonce cookie), `POST /api/auth/verify` (Zod body, cookie-vs-message nonce check, SIWE verify, user upsert, JWT issue), `POST /api/auth/logout` (revokes jti). Installed `siwe`, `jose`, `zod`, `drizzle-orm`, `tailwindcss`/`autoprefixer`/`postcss`, React/Node types. `pnpm --filter @boundaryline/web typecheck` clean — (2026-04-14)
- [x] Full-repo consistency sweep for the single-threshold pivot — updated un-touched files that still referenced the old "rank by earnedBalance" / "pay-to-win" framing: root `README.md`, `docs/README.md`, `docs/CONTRACTS.md`, `docs/DEPLOYMENT.md` (removed broken Hobby cron snippet), `docs/ROADMAP.md`, `docs/DEMO_TRANSACTIONS.md`, `docs/SETUP.md`, `packages/shared/README.md`, `packages/contracts/README.md`, `BUILD_CHECKLIST.md`. Every user-facing surface now speaks the same language: rank by `balanceOf`, qualify + claim at `earnedBalance ≥ 10k` — (2026-04-14)
- [x] Simplified leaderboard qualification to a single 10k threshold — collapsed the two-tier (1k visibility / 10k claim) model into one (10k for both). Same threshold, two enforcement points (backend filter + on-chain claim gate). Cleaner pitch, one constant, same anti-whale properties. Removed `MIN_EARNED_FOR_LEADERBOARD_WEI` from `packages/shared/constants.ts`; updated all 10 files touched in the prior pivot — (2026-04-14)
- [x] Leaderboard design pivot + doc rewrite — flipped from "rank by earnedBalance" to "rank by balanceOf, qualify by earnedBalance ≥ 10k." Trading/gifting/DEX activity are now core strategic mechanics for qualified players. Committed lazy-refresh indexing strategy (Vercel-only, no daemon) because Hobby crons are daily-only. Updated `docs/TOKENOMICS.md`, `docs/SECURITY.md`, `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `CLAUDE.md` §5 and §7 — (2026-04-13)
- [x] Neon Postgres provisioned + schema migrated + seeds loaded — Singapore region (`ap-southeast-1`), pooled connection, Postgres 16.12; all 13 tables created via `drizzle-kit migrate`, seed loaded 150 players + 5 prize tiers + 1 tournament; row counts verified — (2026-04-13)
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
- [ ] Players & teams API (`/api/players`, `/api/teams`, `/api/teams/me`) — P0
- [ ] Team picker UI (wallet connect + SIWE flow + salary-cap picker) — P0
- [ ] Scoring engine + global leaderboard — P0
- [ ] Sync flow (off-chain points → on-chain `earnedBalance`) — P0
- [ ] Prize leaderboard (on-chain read via multicall) — P0
- [ ] Claim flow with EIP-712 vouchers — P0
- [ ] Trophy showcase page — P1
- [ ] Demo video + pitch deck + README polish — P0

## Blockers
- None

## Key Decisions
- (2026-04-14, 00:40 PKT — supersedes the 23:15 two-tier decision) **Single 10k earned threshold for both leaderboard visibility and prize claim** — collapsed the two-tier design (1k visibility, 10k claim) into one. The leaderboard ranks by `balanceOf DESC` filtered to wallets with `earnedBalance ≥ 10,000 BNDY`, and `PSLPoints.claimTier()` enforces the same 10k threshold on-chain. Rationale: one number is simpler to pitch, simpler to maintain (one constant, no divergence risk), and has the same anti-whale guarantee. The "visible but not claimable" intermediate state was a nice-to-have onboarding detail; engagement for players under 10k is handled by the global leaderboard (inclusive, off-chain). No contract redeploy needed — the deployed `MIN_EARNED_TO_CLAIM` constant already is 10k. The backend filter reads from `packages/shared/constants.ts` (`MIN_EARNED_TO_CLAIM_WEI`).
- (2026-04-13, 23:15 PKT — superseded by the 2026-04-14 entry above) **Rank by `balanceOf`, qualify by `earnedBalance ≥ 1k`, claim by `earnedBalance ≥ 10k`** — two-tier gating with a soft 1k visibility floor and a strict 10k claim gate. Replaced with a single 10k threshold the next session.
- (2026-04-13, 23:15 PKT) **No indexer daemon, lazy-refresh leaderboard** — Vercel Hobby crons are daily-only (confirmed from Vercel docs). Prize leaderboard refreshes inside the `GET /api/leaderboard/prize` handler when the snapshot is >30s stale: multicall over tracked wallets + Transfer-log scan + snapshot upsert. Client polls every 5s. Railway/Fly indexer is a v2 upgrade, not v1. Keeps single-deploy Vercel architecture.
- (2026-04-13) **Transferable ERC-20 with `earnedBalance` tracking** — rationale: user wanted tradability and secondary market. Original decision ranked by `earnedBalance`; superseded above by the balance-ranked model.
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
