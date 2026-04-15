# Performance Plan — Web App Load Times

> Created 2026-04-15. Diagnosis of why most pages feel slow and a concrete plan to fix each bottleneck in priority order.

## Context

BoundaryLine web app (Next.js 16 App Router on Vercel Fluid Compute) feels sluggish on most authenticated pages. Root cause is not a single thing — it's a stack of uncached on-chain reads, redundant RPC calls, and blocking client fetches that compound on every navigation. This doc catalogs each bottleneck with file:line, impact, and a concrete fix.

---

## Bottleneck 1 — Prize leaderboard rebuilds on every request

**Where:** `apps/web/app/api/leaderboard/prize/route.ts:9-22` → `apps/web/lib/prize-state.ts:127-165`

**What happens:** Every `GET /api/leaderboard/prize` runs `getPrizeLeaderboardState()`, which:
1. Expires stale claim/sync rows (DB writes)
2. Loads all tracked wallets from DB
3. Loops wallets in batches of 20, sequentially calling `readContract(balanceOf)` + `readContract(earnedBalance)` per wallet via multicall-per-batch
4. Scans claimed/prize rows
5. Ranks + filters

No cache, no stale check. Runs in full on every leaderboard hit **and** every dashboard-chain-state poll (bottleneck 2 compounds this).

**Impact:** Highest. This is the single heaviest server path in the app. Every 5s poll from AppHeader triggers a full rebuild.

**Fix:**
- Wrap `getPrizeLeaderboardState()` in Next.js 16 `'use cache'` + `cacheLife({ stale: 30, revalidate: 60 })` keyed on tournament id
- Tag the cache (`cacheTag('prize-state')`)
- Call `updateTag('prize-state')` from the sync-confirm and claim-confirm code paths so confirmed on-chain events bust the cache immediately
- Parallelize the per-wallet reads with a single `multicall({ contracts: [...allReads] })` instead of batch-of-20 sequential loop

**Risk:** Low. Cache invalidation is event-driven, so staleness is bounded to 30s worst-case idle + instant on state change.

---

## Bottleneck 2 — AppHeader polls a full leaderboard rebuild every 5s

**Where:** `apps/web/components/app-header.tsx:49-71` → `apps/web/app/api/dashboard/chain-state/route.ts:41-79`

**What happens:** Header is on every page. `useEffect` polls `/api/dashboard/chain-state` every 5s. That route does:
1. Two sequential `readContract` calls (`earnedBalance`, `balanceOf`)
2. A full `getPrizeLeaderboardState()` rebuild just to compute the user's rank

**Impact:** Very high. Combines with bottleneck 1 — every 5s, every open tab, every user.

**Fix:**
- Batch both `readContract` calls into a single viem `multicall` (one RPC round-trip instead of two)
- Read rank from the *cached* snapshot produced in bottleneck 1 (no rebuild)
- Client: replace raw `useEffect` fetch with SWR (`useSWR` + `dedupingInterval: 10_000`, `revalidateOnFocus: false`)
- Bump poll interval to 15s; SWR handles stale-while-revalidate so UI stays snappy

**Risk:** Low.

---

## Bottleneck 3 — `/api/trophies/[wallet]` scans 9000 blocks + N+1 reconciles per call

**Where:** `apps/web/app/api/trophies/[wallet]/route.ts:48-108`

**What happens:** Every call does `getContractEvents({ fromBlock: latestBlock - 9000n })` (~12.5 hours of chain history), then loops matched events doing one DB update per event. `force-dynamic`, no cache.

**Impact:** Medium-high on the trophies page first paint.

**Fix:**
- Per-wallet cache with 60s TTL (`cacheLife({ stale: 60, revalidate: 120 })`)
- Store `last_scanned_block` per wallet in a small table (or Redis if added later); scan only from there forward
- Batch reconciliation: collect updates and run one `UPDATE ... WHERE id = ANY($1)` or a Drizzle `db.batch()` instead of N sequential updates
- Fall back to full 9000-block scan if `last_scanned_block` is missing

**Risk:** Low. Event ordering is idempotent.

---

## Bottleneck 4 — Leaderboard page polls prize tab every 5s, fetches tabs sequentially

**Where:** `apps/web/components/leaderboard-page.tsx:533-557`

**What happens:** Tab switch triggers one fetch; prize tab sets a 5s poll that re-pulls the full payload regardless of whether anything changed. Global and prize are never fetched in parallel.

**Impact:** Medium. Compounds bottleneck 1 for anyone sitting on `/leaderboard`.

**Fix:**
- `Promise.all([fetchGlobal(), fetchPrize()])` on first mount so tab switch is instant
- Compare `updatedAt` from response; skip state update when unchanged (prevents render churn)
- Exponential backoff on poll: 5s → 10s → 20s → 30s when response hash is unchanged, reset to 5s on change
- Or switch to SWR with `refreshInterval` + `compare` function

**Risk:** Low.

---

## Bottleneck 5 — Auth provider blocks render on a redundant profile fetch

**Where:** `apps/web/components/auth-provider.tsx:218-250` (load gate) and `:322-335` (verify response already has profile)

**What happens:** After SIWE verify returns, provider stores the JWT but then fires a second `GET /api/auth/me` to load `username` + `avatarUrl` before unblocking `isProfileLoaded`. Every protected page waits.

**Impact:** Medium. Adds a full RTT to first paint after sign-in and after hard refresh.

**Fix:**
- Return `username` + `avatarUrl` in the SIWE verify response (already returned — just not stored)
- Seed `profile` state from verify response directly; set `isProfileLoaded = true` without the extra fetch
- Keep `/api/auth/me` as a background refresh path only

**Risk:** Very low.

---

## Bottleneck 6 — `/api/dashboard/me` runs a heavy activity query with no cache

**Where:** `apps/web/app/api/dashboard/me/route.ts:109-251`

**What happens:** After the initial 4-way `Promise.all`, if the user has a team, runs a nested 4-table join + `ROW_NUMBER()` window function for recent/upcoming match activity. Unpaginated; `upcomingMatches` pulls all live + first 2 scheduled. No cache.

**Impact:** Medium.

**Fix:**
- `cacheLife({ stale: 10, revalidate: 30 })` on the response, keyed by wallet
- Tag with `user-dashboard:${wallet}`; invalidate on team save, match completion, sync confirm, claim confirm
- Add explicit `LIMIT` clauses on the `upcomingMatches` and `recentMatches` queries
- Consider a materialized view for match-activity if this stays hot

**Risk:** Low, as long as cache tags cover all write paths.

---

## Bottleneck 7 — `/play` runs three sequential match lookups then an unbounded player fetch

**Where:** `apps/web/app/(app)/play/page.tsx:8, 29-101`

**What happens:** `force-dynamic`. Three sequential DB queries to find "the match to show" (by id → live → next scheduled), then an all-active-players query with no LIMIT if no team match is found.

**Impact:** Medium.

**Fix:**
- Collapse the three match lookups into a single SQL query using `COALESCE`/`UNION ALL` with priority order (or one CTE)
- Add `LIMIT 50` on the active-player fallback query
- Drop `force-dynamic`; use `cacheLife({ stale: 15, revalidate: 30 })`

**Risk:** Low.

---

## Execution order

Highest impact first, stopping after each to measure:

1. **Bottleneck 1** — prize-state cache + multicall (unlocks #2 and #4)
2. **Bottleneck 2** — AppHeader SWR + multicall + read from cached snapshot
3. **Bottleneck 5** — auth profile seeding (one-line win, removes a blocking RTT)
4. **Bottleneck 3** — trophies cache + `last_scanned_block`
5. **Bottleneck 4** — leaderboard parallel fetch + backoff
6. **Bottleneck 6** — dashboard/me cache + LIMIT
7. **Bottleneck 7** — play page query consolidation

Expected combined impact: mid-page load from ~2–4s → <800ms; header poll load drops from full-rebuild to a single multicall + cached-snapshot read.

---

## Out of scope

- Moving to a persistent indexer (Railway/Fly) — already marked v2 in `docs/ROADMAP.md`
- Adding Redis — not worth the deploy surface for a hackathon build; Next.js cache + Postgres is enough
- Rate limiting (v1.5 per CLAUDE.md §12)
