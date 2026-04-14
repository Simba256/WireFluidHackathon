# Project Tracker

## Project Summary

BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status

**Status**: Active — Team Picker page shipped, remaining app pages pending

## In Progress

- None

## Recently Completed

- [x] Fixed local SIWE verification so the worktree app accepts the current dev host instead of a stale hardcoded one — `/api/auth/verify` now passes the request host into SIWE domain verification, which prevents `localhost` vs `127.0.0.1` mismatches from surfacing as `Invalid signature` during wallet login on `3002`. Verification: server log showed repeated `401 Invalid signature` before the change, and `pnpm --filter @boundaryline/web typecheck` plus `pnpm --filter @boundaryline/web build` pass after the host-aware verification update — (2026-04-15)
- [x] Fixed false-negative MetaMask detection on the worktree app — changed the wagmi config to register both `metaMask()` and generic injected connectors, updated auth to prefer the first ready MetaMask connector instead of blindly using `connectors[0]`, and broadened the user-facing error mapping for MetaMask's "extension not found" message. Also linked the worktree dev server to the repo's `.env.local` files so `/api/auth/nonce` succeeds on `127.0.0.1:3002`. Verification: `pnpm --filter @boundaryline/web typecheck`, `pnpm --filter @boundaryline/web build`, `curl -i http://127.0.0.1:3002/api/auth/nonce` returned `200`, and the worktree dev server is listening on `127.0.0.1:3002` — (2026-04-15)
- [x] Fixed the stale username chooser by hydrating auth profile fields from the database instead of trusting cached client session blobs — added authenticated `GET /api/auth/me`, stopped persisting `username` and `avatarUrl` in local storage, and now only show the username dialog after the DB-backed profile load confirms `username === ''`. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Split dashboard global standing out of the blocking summary payload — removed `global` from `GET /api/dashboard/me`, added authenticated `GET /api/dashboard/global-standing`, and updated `/dashboard` to fetch rank/percentile after first paint with pulse placeholders only on those rank widgets while the rest of the page stays interactive. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Removed the temporary dashboard balance delay and kept the split-load behavior — `/dashboard` now starts the live balance/prize fetch after the fast summary renders, but without the preview-only client-side sleep, so the pulse only appears when the WireFluid path is actually slow. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Added a temporary 2s simulated WireFluid balance delay on `/dashboard` so the split-load pulse state is easy to see — changed the dashboard client to render the fast summary first, then wait 2 seconds before requesting `GET /api/dashboard/chain-state`, which makes the balance, unsynced delta, and prize widgets visibly pulse in a worst-case preview. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Split dashboard load so WireFluid latency only blocks live balance surfaces — moved `GET /api/dashboard/me` to a fast summary payload, added authenticated `GET /api/dashboard/chain-state` for on-chain balances + prize standing, updated `/dashboard` to render immediately with pulsing balance placeholders, and kept `/prizes` composing both payloads for claim eligibility. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Shipped `/prizes` page — new route `apps/web/app/(app)/prizes/page.tsx` and client component `apps/web/components/prizes-page.tsx` render the Stitch "Seasonal Prizes" design against live data. Fetches `GET /api/prizes` (tier grid with remaining stock) and `GET /api/dashboard/me` (user standing + active claim) in parallel, reuses the dashboard's `useWriteContract` pattern to call `PSLPoints.claimTier` via the existing `POST /api/claim` voucher endpoint, and shows per-card state machine: `Claim Rewards` / `Rank Locked` / `Sold Out` / `Claim Pending` / `Claimed` / `Another Tier Claimed`. Corrected the mock's fake per-tier BNDY prices to match reality ("Burns full wallet") since the contract burns the full wallet balance regardless of tier. Redemption-mechanics section rewrites the Stitch "FairPlay audit" card into a real "Two-Gate Eligibility" explainer referencing the 10k earned + rank band + stock + no-prior-claim gates. Tailwind design tokens + Space Grotesk/Manrope fonts already wired at the app level, and the `(app)` layout supplies the nav chrome so the page renders only main content. Flipped `BUILD_CHECKLIST.md` §5.3 `/prizes` to `[x]`. Verification: `pnpm exec tsc --noEmit` in `apps/web` shows zero new errors (only the pre-existing workspace wagmi resolution warnings that also affect `dashboard-page.tsx`) — (2026-04-15)
- [x] Switched the app back to `user.username` and removed the temporary `display_name` hotfix — updated the Drizzle schema plus dashboard/leaderboard queries to read `username` as the canonical alias column, then dropped `display_name` from Neon so the live DB matches the intended schema again. Verification: direct `psql` schema check on `public.user`, `curl http://127.0.0.1:3001/api/leaderboard/global?limit=5`, `pnpm --filter @boundaryline/db typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Removed misleading DB-id match numbering from the dashboard and fixtures UI — dropped `Match #<id>` labels from dashboard activity cards and removed the separate match-number badge from `/dashboard/fixtures` so the app no longer presents internal row ids as tournament fixture numbers. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Simplified `/dashboard/fixtures` by removing the `Total Fixtures`, `Completed`, `Live`, and `Scheduled` summary cards so the page focuses on the schedule list itself. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Added a full fixtures page linked from the dashboard — shipped authenticated `GET /api/fixtures`, added `/dashboard/fixtures` to render the complete PSL 2026 schedule in chronological order, and kept the dashboard's upcoming-fixtures card as a 4-match preview with a `View all` CTA. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass, and the Next route table now includes both `/api/fixtures` and `/dashboard/fixtures` — (2026-04-15)

## Upcoming / Planned

- [ ] Team picker UI (11-player picker + submit to POST /api/teams) — P0
- [x] Team Picker page (`/play`) — server component fetches players + current match from DB, client component provides search, role filter tabs (ALL/BAT/BOWL/AR/WK), player card grid with add/remove, selection panel with progress bar, and submit to `POST /api/teams`. Existing team loaded on mount. Includes `GET /api/matches/current` route, `(app)` layout with sidebar/bottom nav (`AppNav`), and all supporting components — (2026-04-14)
- [x] Fixed SIWE address casing on the frontend — `apps/web/components/auth-provider.tsx` was lowercasing the connected wallet before building the SIWE message, which made `siwe` reject it as an invalid EIP-55 address during verification. The connect flow now keeps the wallet's original checksummed address for the signed message and still stores/compares a lowercased copy for session state. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-14)
- [x] Fixed local nonce 500 by placing app env where Next actually loads it — added `apps/web/.env.local` with the active Neon connection string plus local auth/SIWE settings for `localhost:3001`, then restarted the app server. Confirmed the API recovered with `curl http://localhost:3001/api/auth/nonce` returning `200` and a fresh nonce payload — (2026-04-14)
- [x] Fixed wallet-link nonce failure caused by over-broad env validation — split `apps/web/lib/env.ts` into scoped loaders so each server path validates only the env it actually needs (`databaseEnv`, `authEnv`, `siweEnv`, `adminEnv`, `signerEnv`). This unblocked `GET /api/auth/nonce` and `POST /api/auth/verify` in local setups where unrelated env like `ADMIN_API_KEY` or `SIGNER_PRIVATE_KEY` were not populated yet. Updated `lib/db.ts`, `lib/jwt.ts`, `lib/siwe.ts`, `lib/admin.ts`, and `lib/voucher.ts` to use the scoped loaders. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` pass — (2026-04-14)

## Upcoming / Planned

- [x] Team picker UI — P0 (done)
- [ ] Dashboard (points/me, sync button → PSLPoints.sync via wagmi) — P0
- [ ] Leaderboard page (global + prize tabs, 5s poll on prize) — P0
- [ ] Prizes page + claim flow (PSLPoints.claimTier via wagmi) — P0
- [ ] Trophy showcase page — P1
- [ ] End-to-end demo run + populate DEMO_TRANSACTIONS.md — P0
- [ ] Vercel link + env vars + prod deploy — P0
- [ ] Demo video + pitch deck + README polish — P0

## Blockers

- Public Vercel URL `https://wire-fluid-hackathon-web.vercel.app` is serving a pre-dashboard build; `/dashboard` returns `404` until the app is redeployed from current `main`

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
