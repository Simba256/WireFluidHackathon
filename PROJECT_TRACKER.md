# Project Tracker

## Project Summary

BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status

**Status**: Active — Team Picker page shipped, remaining app pages pending

## In Progress

- None

## Recently Completed

- [x] Removed redundant `/leaderboard` chrome that restated information already visible in the table — deleted the footer tier legend strip and the `Sorted By` stats cards, then collapsed the summary bar to a two-card layout (`Total Players` + `Last Updated` for global, `Qualified` + `Block` for prize). Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Renamed the prize-standing row label from `Prize Status` to `Status`, which keeps the card copy shorter and avoids repeating the prize context already established by the card heading. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Centered the dashboard leaderboard CTA and shortened its copy to `View Leaderboard`, so the footer action in the global standings card reads cleaner and no longer hugs the right edge. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Removed the duplicate `Top` wording from the dashboard global-percentile row so the right-side value now reads as a plain percentage (`100%`) instead of repeating the row label as `Top 100%`. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Centered the dashboard wallet-balance card content vertically — changed the card body from bottom-aligned to vertically centered so the `Wallet Balance` label and main BNDY figure no longer sit awkwardly low inside the card. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Removed the redundant `On-chain earned` line from the dashboard wallet-balance card, leaving the main BNDY balance as the only visible metric in that block since the earned amount was already represented elsewhere on the page. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Simplified and enlarged the completed-match score chips — removed the repeated team short forms from the score pills on `/dashboard` and `/dashboard/fixtures` and increased the score typography so the card doesn't restate labels already shown in the matchup row. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Backfilled missing completed-match score summaries into Neon — the `/dashboard/fixtures` UI and `/api/fixtures` route were already wired for `team_a_score` / `team_b_score`, but the live `match` rows still had blank values, so completed fixtures rendered `Official scoreline unavailable`. Re-ran `pnpm --filter @boundaryline/db seed`, which refreshed the existing `match` metadata from `data/matches.json` and restored recent scorelines for completed fixtures. Verification: direct Postgres query confirmed populated `team_a_score` / `team_b_score` values on recent completed matches, and `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Fixed dashboard "unsynced" delta persisting after a successful claim — after `claimTier()` resets on-chain `earnedBalance` to 0, `user_point.total_points` still held the lifetime figure so `unsynced = totalEarned - onChainEarned - pending` re-showed the burned amount. Added `claim.earned_at_claim numeric(78,0)` (migration `0007_add_earned_at_claim.sql`), populated on voucher issue in `apps/web/app/api/claim/route.ts`, and subtracted `SUM(earned_at_claim) WHERE status='confirmed'` from the delta in both `apps/web/app/api/dashboard/chain-state/route.ts` and `apps/web/app/api/points/me/route.ts`. Backfilled sim's existing claim row with `526236 * 10^18`. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Removed the extra explanatory sentence from the global leaderboard card and left only the `View full leaderboard` CTA, which makes the standings block read cleaner without the redundant on-card explanation. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Tightened the dashboard match-card loading skeleton so the date area now reads like the real stacked date block instead of two rounded pill bubbles, keeping the placeholder closer to the shipped scoreboard layout. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Clarified dashboard standings by separating prize context from global context — turned the top-right status card into `Prize Standing` (prize rank, prize status, eligible tier, progress, claim CTA) and simplified the lower-left card into `Global Leaderboard` (`#rank of total`, top percentile, total points, plus a `View full leaderboard` CTA). Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Fixed the dashboard runtime crash introduced by the new in-place skeleton pass — `apps/web/components/dashboard-page.tsx` still had two stale `statusLabel` references in the leaderboard card after the status variable was renamed to `prizeStatusLabel`, which caused `/dashboard` to throw before render. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Built the `/trophies` Awards page — new server route at `apps/web/app/(app)/trophies/page.tsx` and client component `apps/web/components/trophies-page.tsx` that fetches `/api/trophies/[wallet]` and renders a museum-style grid of soulbound trophy NFT cards (tier badge, tier image, mint date, on-chain explorer link) plus a collection summary (total trophies, BNDY burned, highest tier). Extended the trophies API to scan `PSLPoints.TierClaimed` events via `getContractEvents` and attach per-trophy `burnedAmount` (string) so the summary strip has real on-chain data. Added `burnedAmount?: string` to `TrophyDTO` in `packages/shared/src/types/dto.ts`. Signed-out users see a connect-wallet prompt, empty-state shows a "Victory Awaits" card linking to `/prizes`. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-15)
- [x] Rebuilt dashboard and fixtures match cards into a Cricinfo-style scoreboard layout — added `fixtureNumber` to the dashboard/fixtures payloads, moved the date block to the left and `Match <n>` + venue meta to the right, switched the matchup row to a horizontal `team1 / VS / team2` strip with logos, short codes, and full names, and tightened the footer into either score chips or kickoff status. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Turned the dashboard and fixtures short-code headings into a blockier motorsport-style wordmark — replaced the earlier display-font experiment with `Oxanium`, tightened the scoreboard CSS into a sharper italicized block treatment, and kept it scoped to the `KK / LQ / IU / QG / PZ / MS / HHK / RWP` matchup headings on both pages. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Restored the original franchise short forms on dashboard and fixtures cards — kept the new scoreboard-style short-code headings, but reverted the shared codes to the repo's existing set (`KK`, `LQ`, `IU`, `QG`, `PZ`, `MS`, `HHK`, `RWP`) after the alternate abbreviations proved incorrect. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Updated `/dashboard/fixtures` to match the new dashboard match-card system — rebuilt the fixtures cards with the same circular oversized team logos, desktop-width horizontal layout, side metadata rail, and completed-match scoreline chips used on `/dashboard`, so the full schedule page now feels visually consistent with the main activity feed. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Removed the duplicated `Match Activity` heading on the dashboard — deleted the extra outer section title and kept the inner `MatchActivitySection` heading so the label only renders once. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)

## Upcoming / Planned

- [ ] Team picker UI (11-player picker + submit to POST /api/teams) — P0
- [x] Team Picker page (`/play`) — server component fetches players + current match from DB, client component provides search, role filter tabs (ALL/BAT/BOWL/AR/WK), player card grid with add/remove, selection panel with progress bar, and submit to `POST /api/teams`. Existing team loaded on mount. Includes `GET /api/matches/current` route, `(app)` layout with sidebar/bottom nav (`AppNav`), and all supporting components — (2026-04-14)
- [x] Fixed SIWE address casing on the frontend — `apps/web/components/auth-provider.tsx` was lowercasing the connected wallet before building the SIWE message, which made `siwe` reject it as an invalid EIP-55 address during verification. The connect flow now keeps the wallet's original checksummed address for the signed message and still stores/compares a lowercased copy for session state. Verification: `pnpm --filter @boundaryline/web typecheck` passes — (2026-04-14)
- [x] Fixed local nonce 500 by placing app env where Next actually loads it — added `apps/web/.env.local` with the active Neon connection string plus local auth/SIWE settings for `localhost:3001`, then restarted the app server. Confirmed the API recovered with `curl http://localhost:3001/api/auth/nonce` returning `200` and a fresh nonce payload — (2026-04-14)
- [x] Fixed wallet-link nonce failure caused by over-broad env validation — split `apps/web/lib/env.ts` into scoped loaders so each server path validates only the env it actually needs (`databaseEnv`, `authEnv`, `siweEnv`, `adminEnv`, `signerEnv`). This unblocked `GET /api/auth/nonce` and `POST /api/auth/verify` in local setups where unrelated env like `ADMIN_API_KEY` or `SIGNER_PRIVATE_KEY` were not populated yet. Updated `lib/db.ts`, `lib/jwt.ts`, `lib/siwe.ts`, `lib/admin.ts`, and `lib/voucher.ts` to use the scoped loaders. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` pass — (2026-04-14)

## Upcoming / Planned

- [x] Team picker UI — P0 (done)
- [ ] Dashboard (points/me, sync button → PSLPoints.sync via wagmi) — P0
- [x] Leaderboard page (global + prize tabs, 5s poll on prize) — P0 (done)
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
