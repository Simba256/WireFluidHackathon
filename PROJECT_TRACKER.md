# Project Tracker

## Project Summary

BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status

**Status**: Active — Team Picker page shipped, remaining app pages pending

## In Progress

- None

## Recently Completed

- [x] Rebuilt dashboard and fixtures match cards into a Cricinfo-style scoreboard layout — added `fixtureNumber` to the dashboard/fixtures payloads, moved the date block to the left and `Match <n>` + venue meta to the right, switched the matchup row to a horizontal `team1 / VS / team2` strip with logos, short codes, and full names, and tightened the footer into either score chips or kickoff status. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Turned the dashboard and fixtures short-code headings into a blockier motorsport-style wordmark — replaced the earlier display-font experiment with `Oxanium`, tightened the scoreboard CSS into a sharper italicized block treatment, and kept it scoped to the `KK / LQ / IU / QG / PZ / MS / HHK / RWP` matchup headings on both pages. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Restored the original franchise short forms on dashboard and fixtures cards — kept the new scoreboard-style short-code headings, but reverted the shared codes to the repo's existing set (`KK`, `LQ`, `IU`, `QG`, `PZ`, `MS`, `HHK`, `RWP`) after the alternate abbreviations proved incorrect. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Updated `/dashboard/fixtures` to match the new dashboard match-card system — rebuilt the fixtures cards with the same circular oversized team logos, desktop-width horizontal layout, side metadata rail, and completed-match scoreline chips used on `/dashboard`, so the full schedule page now feels visually consistent with the main activity feed. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Removed the duplicated `Match Activity` heading on the dashboard — deleted the extra outer section title and kept the inner `MatchActivitySection` heading so the label only renders once. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Polished the dashboard match cards so the side metadata no longer fights the matchup content — changed the team logos from rounded squares to circles, removed the nested contrasting card treatment from the venue/date rail, and narrowed that rail so long team names get more horizontal room. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Widened the authenticated app shell so the whole dashboard can use more desktop width — increased `AppChrome` from `max-w-7xl` to a wider custom container and matched the footer width, which gives the hero, standing cards, and match rail more horizontal room instead of only enlarging the inner match-card content. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Adjusted the new dashboard match cards to actually use desktop width — shifted the card body from an extra-wide breakpoint stack to a real large-screen two-column layout so the enlarged team logos and side metadata rail sit beside the matchup content instead of dropping below it. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Reworked dashboard match activity into a larger, score-aware match rail — resized the activity cards and team logo pucks substantially, moved venue/date into a dedicated side metadata block, removed the old status/fantasy-points widgets, and now compose the feed as all live matches first, then the next 2 scheduled fixtures, then the latest 2 completed matches. Added DB-backed `match.team_a_score` / `match.team_b_score`, extended `data/matches.json` with Cricinfo score summaries for all completed PSL fixtures, applied the new columns to Neon, and re-ran `pnpm --filter @boundaryline/db seed` so recent cards now show official team scorelines like `MS 172/8` and `PZ 196/6`. Verification: direct Neon query confirmed recent completed score summaries, `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/db typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Removed the duplicate dashboard/fixtures sidebars by collapsing onto the shared app shell — deleted the page-local desktop sidebar and mobile bottom nav from `apps/web/components/dashboard-page.tsx`, updated `fixtures-page.tsx` to stop passing the old `dashboard` chrome prop, and left `(app)/layout.tsx`'s `AppNav` as the single source of navigation for authenticated pages. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)

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
