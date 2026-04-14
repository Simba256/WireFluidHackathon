# Project Tracker

## Project Summary

BoundaryLine — a free-to-play fantasy PSL game on WireFluid where players pick teams, earn points from real match performance, and claim real-world prizes via on-chain soulbound trophy NFTs. Built for the WireFluid Hackathon (2026-04-13 → 2026-04-14).

## Current Status

**Status**: Active — Dashboard shipped, remaining core app pages pending

## In Progress

- None

## Recently Completed

- [x] Refined dashboard team-logo styling to fit the dark theme better — enlarged the match-card team logo pucks in `apps/web/components/dashboard-page.tsx`, removed the white coin background, and switched to a darker framed treatment with accent-colored outlines so the Cricinfo logos feel native to the dashboard instead of pasted on top. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Removed the player-cost model from the active product scope — dropped salary-cap and pricing fields from the shared DTOs, player/team/dashboard APIs, DB schema, seeds, landing copy, and spec docs; team creation now only enforces 11 active unique players plus one-team-per-tournament. Generated Drizzle migration `0003_swift_black_queen.sql` to drop `player.base_price` and `team.total_credits`, regenerated `data/psl-2026-players.json`, and updated planning docs so future work no longer assumes pricing mechanics. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/db typecheck`, `pnpm --filter @boundaryline/web typecheck`, `pnpm --filter @boundaryline/web build`, and repo search confirmed no pricing/cap references remain in active code/docs/data outside historical Drizzle migrations — (2026-04-15)
- [x] Replaced placeholder team pucks with local PSL franchise logos scraped from ESPN Cricinfo — fetched the six PSL team pages from Cricinfo, extracted each franchise `og:image`, downloaded the PNG assets into `apps/web/public/team-logos`, added `logoPath` to shared franchise metadata/DTOs, and updated the dashboard match cards to render the local logos instead of colored short-code circles. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, and `pnpm --filter @boundaryline/web build` all pass — (2026-04-15)
- [x] Fixed landing-page nav state and dashboard routing — updated `apps/web/components/landing-nav.tsx` so `/` no longer shows Dashboard as the active tab, and the Dashboard nav item now links to `/dashboard` instead of `/#`. Verification: `pnpm --filter @boundaryline/web typecheck` and `pnpm --filter @boundaryline/web build` both pass — (2026-04-15)
- [x] Removed the top-level timestamp from both tracking files so freshness now comes from dated entries and checklist state instead. Verification: repo search confirms the old header string no longer appears in either tracking file — (2026-04-15)
- [x] Dashboard now falls back to upcoming fixtures and Neon has scheduled matches to show — added `upcomingMatches` to `GET /api/dashboard/me`, fixed the dashboard feed to render scheduled/live fixtures when there are no scored matches to show, corrected the upcoming-match query filter, and updated `data/matches.json` plus `packages/db/seed/index.ts` so new match seeds insert without duplicating existing rows. Seeded 3 scheduled matches into Neon: `Karachi Kings vs Multan Sultans`, `Islamabad United vs Lahore Qalandars`, and `Peshawar Zalmi vs Quetta Gladiators`. Verification: `pnpm --filter @boundaryline/web typecheck`, `pnpm --filter @boundaryline/web build`, and direct Neon query confirmed scheduled match ids `4`, `5`, and `6` — (2026-04-15)
- [x] Diagnosed public `/dashboard` 404 as a stale Vercel deployment, not a route bug — confirmed the route exists at `apps/web/app/(app)/dashboard/page.tsx`, local `pnpm --filter @boundaryline/web build` includes `○ /dashboard`, and `curl -I https://wire-fluid-hackathon-web.vercel.app/dashboard` returns `404` while the current public deployment predates commit `265cda5` that shipped the dashboard. Verification: local Next build route table + live Vercel response headers — (2026-04-15)
- [x] Local signer env configured and web backend restarted — verified the provided private key derives to the deployed `trustedSigner` address `0xeCBBF715d35FdD6f56316fb1B64B89C1B329aCd1`, added it to `apps/web/.env.local` as `SIGNER_PRIVATE_KEY`, and restarted the local Next app on `127.0.0.1:3001`. Verification: `curl -I http://127.0.0.1:3001` returned `200` and `lsof -nP -iTCP:3001 -sTCP:LISTEN` shows the app listening locally — (2026-04-15)
- [x] Sync flow hardened against missing signer env and stuck pending vouchers — found that local sync was failing because `SIGNER_PRIVATE_KEY` is not configured in repo env files, and `POST /api/sync` was inserting a `pending` row before attempting to sign. Reordered both sync and claim voucher flows so signing happens before DB reservation, added `POST /api/sync/cancel` and `POST /api/sync/confirm` for frontend cleanup/receipt confirmation, fixed the shared claim typed-data schema to use `uint8` for `tierId`, and manually expired the stuck pending sync rows for wallet `0x400b9E86dca96E775578aD95dF095e6d9fAC00d6`. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/web typecheck`, `pnpm --filter @boundaryline/web build`, and direct Neon query confirmed `pendingCount = 0` for that wallet — (2026-04-15)
- [x] Dashboard copy simplified + demo wallet data populated — updated the dashboard status presentation to remove the confusing "BUILDING" and minimum-earned copy, replacing the lower status card with just `Status`, `Leaderboard Rank`, `Leaderboard %`, and `Total Points`. For wallet `0x400b9E86dca96E775578aD95dF095e6d9fAC00d6`, inserted a demo team plus scored rows across the 3 seeded completed matches, which produced `user_point.total_points = 586` and populated the match-performance feed. Verification: `pnpm --filter @boundaryline/web typecheck`, `pnpm --filter @boundaryline/web build`, and direct Neon query confirmed 3 recent matches with points `200`, `258`, and `128` — (2026-04-14)
- [x] Dashboard shipped with real backend data and on-chain actions — implemented `/dashboard` with the Stitch-inspired responsive shell, live `sync()` and `claimTier()` transactions via wagmi, a recent match activity feed, and a new aggregated `GET /api/dashboard/me` payload. Bundled backend fixes that the UI depended on: `/api/points/me` and `/api/claim` now derive prize state from the prize leaderboard instead of global rank, stale pending claim/sync vouchers are swept before reads, `/api/leaderboard/prize` now reports real claimability, admin rescoring applies score diffs instead of double-counting, `match.venue` was added for dashboard activity, and demo fixtures were seeded from `data/matches.json`. Applied migration `0002_bumpy_spiral.sql` to Neon and re-ran seed. Verification: `pnpm --filter @boundaryline/shared typecheck`, `pnpm --filter @boundaryline/db typecheck`, `pnpm --filter @boundaryline/web typecheck`, `pnpm --filter @boundaryline/web build`, and local `curl -I http://127.0.0.1:3001/dashboard` returned `200` — (2026-04-14)

## Upcoming / Planned

- [ ] Team picker UI (11-player picker + submit to POST /api/teams) — P0
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
