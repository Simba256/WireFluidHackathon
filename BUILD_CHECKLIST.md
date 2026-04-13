# BoundaryLine — Master Build Checklist

> Last updated: 2026-04-14 (03:27 PKT)
> Companion to `PROJECT_TRACKER.md`. This file is the **exhaustive** work breakdown pulled from every doc under `docs/`. `PROJECT_TRACKER.md` shows recent activity; this file tracks the full scope from spec → shipped.

**Legend:** `[ ]` = not started · `[~]` = partial / in progress · `[x]` = done · `[-]` = skipped / deferred
**Source** = doc that specifies the item.

---

## 0. Monorepo & Infrastructure

- [x] Root `package.json` with workspaces — _SETUP.md_
- [x] `turbo.json` task graph — _DEPLOYMENT.md_
- [x] `tsconfig.base.json` — _SETUP.md_
- [x] `pnpm-workspace.yaml` — _SETUP.md_
- [x] `.env.example` at root — _SETUP.md_
- [x] `.gitignore` (node*modules, .env.local, .next, artifacts, .turbo) — \_SETUP.md*
- [~] `.env.local` populated — local database, auth, admin, chain, and contract env set; signer still pending — \_SETUP.md\*
- [x] Neon project created (main branch, connection string) — _SETUP.md / DEPLOYMENT.md_
- [ ] Vercel project linked (`vercel link`) — _DEPLOYMENT.md_
- [ ] `vercel.ts` config (build, framework, headers, crons) — _DEPLOYMENT.md_

---

## 1. Smart Contracts (`packages/contracts`)

### 1.1 Project scaffolding

- [x] Hardhat initialized, `hardhat.config.ts` (Solidity 0.8.24, optimizer 200) — _CONTRACTS.md_
- [x] WireFluid testnet network (chain 92533, RPC, explorer) — _WIREFLUID.md_
- [x] wirefluidscan verification config — _CONTRACTS.md / DEPLOYMENT.md_
- [x] OpenZeppelin v5 installed (ERC20, ERC721, ECDSA, EIP712, AccessControl) — _CONTRACTS.md_
- [x] Scripts: `compile`, `test`, `coverage`, `lint`, `slither`, `deploy:testnet` — _SETUP.md_
- [x] `.env.example` (DEPLOYER*PRIVATE_KEY, SIGNER_ADDRESS, WIREFLUIDSCAN_API_KEY) — \_SETUP.md*

### 1.2 `PSLPoints.sol` (ERC-20 BNDY)

- [x] State: `earnedBalance`, `usedNonces`, `trustedSigner` immutable, `trophies` addr, `MIN_EARNED_TO_CLAIM = 10_000e18` — _CONTRACTS.md_
- [x] Events: `Synced`, `TierClaimed`, `TrophiesContractSet` — _CONTRACTS.md_
- [x] `sync(voucher, sig)` — verify EIP-712, mint, bump earnedBalance, mark nonce — _CONTRACTS.md_
- [x] `claimTier(voucher, sig)` — gate on earnedBalance, burn full balance, reset earned, cross-call trophy mint — _CONTRACTS.md_
- [x] `setTrophies(addr)` one-shot admin setter — _CONTRACTS.md_
- [x] EIP-712 domain "BoundaryLine" v1 + `SyncVoucher` / `ClaimVoucher` typed structs — _CONTRACTS.md_
- [x] Standard ERC-20 surface intact (transfer/approve/etc.) — _CONTRACTS.md_

### 1.3 `PSLTrophies.sol` (Soulbound ERC-721)

- [x] State: `minter` immutable, `nextTokenId`, `tokenTier`, `tokenTournamentId`, `tierNames` — _CONTRACTS.md_
- [x] `TrophyMinted` event — _CONTRACTS.md_
- [x] `mintTrophy(winner, tierId, tournamentId)` (minter-only) — _CONTRACTS.md_
- [x] `tokenURI` returns inline SVG + JSON data URI — _CONTRACTS.md_
- [x] `_update` override blocks all transfers (soulbound) — _CONTRACTS.md_

### 1.4 Tests (Hardhat + Chai, >90% cov)

- [x] Sync: correct mint + earned increment — _CONTRACTS.md_
- [x] Sync: replayed nonce reverts — _CONTRACTS.md_
- [x] Sync: bad signature reverts — _CONTRACTS.md_
- [x] Sync: zero amount reverts — _CONTRACTS.md_
- [x] Transfers move `balanceOf` but NOT `earnedBalance` — _CONTRACTS.md / SECURITY.md_
- [x] Claim below `MIN_EARNED_TO_CLAIM` reverts — _CONTRACTS.md_
- [x] Claim: replayed nonce reverts — _CONTRACTS.md_
- [x] Claim: bad signature reverts — _CONTRACTS.md_
- [x] Claim burns full wallet balance (including gifted excess) — _CONTRACTS.md_
- [x] Claim resets `earnedBalance` to 0 — _CONTRACTS.md_
- [x] Claim mints trophy cross-call — _CONTRACTS.md_
- [x] Second claim blocked by reset — _CONTRACTS.md_
- [x] `setTrophies` is one-shot — _CONTRACTS.md_
- [x] Trophies: only minter mints — _CONTRACTS.md_
- [x] Trophies: transfers always revert — _CONTRACTS.md_
- [x] Trophies: `tokenURI` valid data URI, correct metadata — _CONTRACTS.md_
- [x] Slither: zero high/medium — _SECURITY.md_
- [x] solhint clean — _SECURITY.md_

### 1.5 Deployment

- [x] `deploy.ts` script (PSLPoints → PSLTrophies → setTrophies) — _CONTRACTS.md_
- [x] Deployed to WireFluid testnet — _DEPLOYMENT.md_
- [x] Addresses + ABIs saved to `deployments/wirefluid-testnet.json` — _CONTRACTS.md_
- [x] Verified on wirefluidscan.com — _DEPLOYMENT.md_
- [ ] Backend signer funded with test WIRE — _SETUP.md_

---

## 2. Database (`packages/db`)

### 2.1 Drizzle schema tables

- [x] `user` (wallet PK, display*name, timestamps) — \_DATA_MODEL.md*
- [x] `siwe_nonce` (nonce PK, issued*at, expires_at, consumed_at) — \_DATA_MODEL.md*
- [x] `player` (id, external*id unique, name, team, role, base_price, photo_url, active) — \_DATA_MODEL.md*
- [x] `match` (id, tournament*id, team_a, team_b, scheduled_at, status, played_at) — \_DATA_MODEL.md*
- [x] `player_score` (match*id, player_id, runs, wickets, catches, run_outs, stumpings, dismissed_for_zero, points_awarded) — \_DATA_MODEL.md*
- [x] `team` (id, user*wallet, tournament_id, total_credits) — \_DATA_MODEL.md*
- [x] `team_player` (team*id, player_id composite PK) — \_DATA_MODEL.md*
- [x] `user_point` (wallet, tournament*id, total_points, last_match_id) — \_DATA_MODEL.md*
- [x] `synced_record` (wallet, amount, nonce, tx*hash, block_number, status, voucher_expires_at) — \_DATA_MODEL.md*
- [x] `claim` (wallet, tier*id, nonce, tx_hash, trophy_token_id, fulfillment_status, status) — \_DATA_MODEL.md*
- [x] `prize` (tournament*id, tier_id, name, desc, image, stock_limit, rank_required) — \_DATA_MODEL.md*
- [x] `prize_leaderboard_snapshot` (wallet, tournament*id, earned_balance, rank, snapshot_block) — \_DATA_MODEL.md*
- [x] `tournament` (id, name, status, started/closed/grace timestamps) — _DATA_MODEL.md_
- [x] `admin_session` (optional) — _DATA_MODEL.md_

### 2.2 Indexes & constraints

- [x] Wallet CHECK constraint (lowercase 0x…) — _DATA_MODEL.md_
- [x] `player`: unique external*id, idx team, idx role — \_DATA_MODEL.md*
- [x] `match`: idx (tournament*id, status) — \_DATA_MODEL.md*
- [x] `player_score`: unique (match*id, player_id), idx player_id — \_DATA_MODEL.md*
- [x] `team`: unique (user*wallet, tournament_id) — \_DATA_MODEL.md*
- [x] `user_point`: idx (tournament*id, total_points DESC) — \_DATA_MODEL.md*
- [x] `synced_record`: unique nonce, idx (wallet, tournament*id) — \_DATA_MODEL.md*
- [x] `claim`: unique nonce, unique (wallet, tournament*id) partial — \_DATA_MODEL.md*
- [x] `prize`: unique (tournament*id, tier_id) — \_DATA_MODEL.md*
- [x] `prize_leaderboard_snapshot`: idx (tournament*id, rank) — \_DATA_MODEL.md*
- [ ] `prize_leaderboard_snapshot`: add `wallet_balance` column + idx (tournament*id, wallet_balance DESC) — \_DATA_MODEL.md* (**post-pivot, needs schema migration**)
- [ ] `tracked_wallet` table (wallet PK, first*seen_via, last_touched) — \_DATA_MODEL.md* (**post-pivot**)
- [ ] `indexer_cursor` table (contract*address PK, last_scanned_block) — \_DATA_MODEL.md* (**post-pivot**)

### 2.3 Migrations & seeds

- [x] Drizzle migration 0001 generated — _DATA_MODEL.md_
- [x] `players.json` seed (~150 PSL 2026 players) — _DATA_MODEL.md / GAME_DESIGN.md_
- [x] `prizes.json` seed (5 tiers × stock 1/3/10/25/50) — _DATA_MODEL.md / GAME_DESIGN.md_
- [x] Tournament row seed — _DATA_MODEL.md_
- [x] `db:push`, `db:migrate`, `db:seed`, `db:studio` scripts — _SETUP.md_

### 2.4 Query helpers

- [x] Point calculation helper — _GAME_DESIGN.md_
- [x] Global leaderboard rank query — _DATA_MODEL.md_
- [x] Tier stock count helper — _DATA_MODEL.md_

---

## 3. Shared Package (`packages/shared`)

- [x] `wirefluid.ts` viem `defineChain` — _WIREFLUID.md_
- [~] wagmi config export — deferred to `apps/web` (wagmi only meaningful in browser context) — _WIREFLUID.md_
- [x] Chain constants (id, rpc, explorer, faucet) — _WIREFLUID.md_
- [x] `PSLPoints` ABI export — _CONTRACTS.md_
- [x] `PSLTrophies` ABI export — _CONTRACTS.md_
- [x] Contract TS types (viem `as const` ABI inference) — _CONTRACTS.md_
- [x] `SyncVoucher` / `ClaimVoucher` TS types + EIP-712 typed-data structs — _ARCHITECTURE.md_
- [x] User / Player / Team / Match / Prize / Leaderboard DTOs — _API.md_
- [x] Error type `{ error, code }` + full code catalog — _API.md_
- [x] Game constants (SALARY*CAP, MIN_EARNED, TEAM_SIZE, tier stocks, formula multipliers) — \_GAME_DESIGN.md*

---

## 4. Backend API (`apps/web/app/api`)

### 4.1 Auth

- [x] `GET /api/auth/nonce` — _API.md_
- [x] `POST /api/auth/verify` (SIWE → JWT, upsert user) — _API.md_
- [x] `POST /api/auth/logout` (JWT blacklist) — _API.md_

### 4.2 Players & Teams

- [x] `GET /api/players` (cached 1h) — _API.md_
- [x] `POST /api/teams` (validate 11 players, salary cap, no dup, no existing team) — _API.md_
- [x] `GET /api/teams/me` — _API.md_

### 4.3 Points & Sync

- [x] `GET /api/points/me` (earned, onChainEarned, walletBalance, unsynced, ranks, tier, canClaim) — _API.md_
- [x] `POST /api/sync` (delta, nonce, EIP-712 sign, pending record, expires) — _API.md_

### 4.4 Claims

- [x] `POST /api/claim` (earned gate, rank check, stock reserve, voucher) — _API.md_
- [x] `GET /api/claim/status` — _API.md_

### 4.5 Leaderboards

- [x] `GET /api/leaderboard/global` (paginated) — _API.md_ (`around` param deferred)
- [~] `GET /api/leaderboard/prize` — lazy multicall read over distinct synced wallets; full Transfer-log scan + snapshot upsert deferred — _API.md_

### 4.6 Prizes & Trophies

- [x] `GET /api/prizes` (tiers + live stock) — _API.md_
- [x] `GET /api/trophies/:wallet` (tokenURI per confirmed claim) — _API.md_

### 4.7 Admin

- [x] `POST /api/admin/matches` — _API.md_
- [x] `POST /api/admin/matches/:id/scores` (compute points, update user*point) — \_API.md*
- [x] `POST /api/admin/tournaments/:id/close` (grace period) — _API.md_

### 4.8 Infra helpers

- [x] SIWE parse/verify util — _SETUP.md_
- [x] JWT issue/verify — _SETUP.md_
- [x] EIP-712 signer util (`lib/voucher.ts`) — _ARCHITECTURE.md_
- [x] Drizzle query helpers — per-route usage via @boundaryline/db helpers — _SETUP.md_
- [x] viem read clients for PSLPoints / PSLTrophies (`lib/viem.ts`) — _ARCHITECTURE.md_
- [x] Zod validation (per-route inline) — _API.md / SECURITY.md_
- [x] Standardized error responses — _API.md_
- [-] Rate limiting (v1.5) — _SECURITY.md_

---

## 5. Frontend (`apps/web`)

### 5.1 Setup

- [x] Tailwind config — _README.md_
- [ ] shadcn/ui init + core components — _README.md_
- [x] Global styles / tokens — _README.md_
- [x] wagmi + viem + RainbowKit (or equivalent) wired to WireFluid — _WIREFLUID.md_

### 5.2 Marketing pages

- [x] `/` landing (hero, pitch, connect CTA) — _README.md_
- [ ] `/how-it-works` — _README.md_
- [ ] `/about` — _README.md_

### 5.3 App pages

- [ ] `/dashboard` (earned, synced, wallet balance, unsynced, sync button, rank, tier) — _API.md / GAME_DESIGN.md_
- [ ] `/play` team picker (search, filters, salary cap, 11-slot submit) — _GAME_DESIGN.md_
- [ ] `/leaderboard` (global + prize tabs) — _API.md_
- [ ] `/prizes` (tier cards, stock, claim) — _GAME_DESIGN.md_
- [ ] `/trophies` (user's soulbound NFTs) — _API.md_

### 5.4 Admin

- [ ] `/admin` key auth + match CRUD + score entry form — _API.md_

### 5.5 Components

- [x] ConnectWallet button — _ARCHITECTURE.md_ (SIWE message uses checksummed wallet address)
- [ ] Chain guard / switcher — _WIREFLUID.md_
- [ ] PlayerCard — _GAME_DESIGN.md_
- [ ] TeamGrid (11 slots + cap bar) — _GAME_DESIGN.md_
- [ ] SalaryCapCalculator — _GAME_DESIGN.md_
- [ ] LeaderboardRow — _API.md_
- [ ] TierCard — _GAME_DESIGN.md_
- [ ] TrophyNFT display — _API.md_
- [ ] TransactionStatus (tx hash → explorer) — _ARCHITECTURE.md_
- [ ] Error message components — _API.md_

### 5.6 Hooks

- [x] `useAuth` — _ARCHITECTURE.md_ (stores lowercase wallet, signs with checksummed wallet)
- [ ] `useTeam` — _ARCHITECTURE.md_
- [ ] `usePoints` — _ARCHITECTURE.md_
- [ ] `useLeaderboard` — _ARCHITECTURE.md_
- [ ] `usePrizes` — _ARCHITECTURE.md_
- [ ] `useTrophies` — _ARCHITECTURE.md_
- [ ] `useWalletSync` — _ARCHITECTURE.md_
- [ ] `useClaimTier` — _ARCHITECTURE.md_
- [ ] `useChainGuard` — _WIREFLUID.md_

### 5.7 Polish (v1.5)

- [-] Full responsive pass — _ROADMAP.md_
- [-] Accessibility pass — _ROADMAP.md_

---

## 6. Scoring Engine

- [x] Formula: `runs + wickets*25 + catches*10 + run_outs*10 + stumpings*10 + bonuses - penalties` — _GAME_DESIGN.md_ (`calculatePlayerPoints`)
- [x] Bonuses: 50+ runs (+20), 100+ runs (+50), 5+ wkts (+50) — _GAME_DESIGN.md_
- [x] Penalty: duck (-5) — _GAME_DESIGN.md_
- [x] Team score = sum of 11 players — _GAME_DESIGN.md_ (distinct-join aggregation)
- [x] User total accumulates across matches — _GAME_DESIGN.md_ (upsert `total_points + delta`)
- [x] Atomic update on score submission — _DATA_MODEL.md_ (wrapped in tx)

---

## 7. Sync Flow

- [x] Backend computes `delta = totalEarned − onChainEarned − pendingWei` — _ARCHITECTURE.md_
- [x] Unique nonce generation (`generateNonce`) — _ARCHITECTURE.md_
- [x] EIP-712 voucher sign (5 min TTL) — _ARCHITECTURE.md_
- [x] Gas estimate returned (~70k) — _API.md_
- [ ] Frontend `PSLPoints.sync()` via wagmi — _ARCHITECTURE.md_
- [ ] `Synced` event observer → DB confirm — _ARCHITECTURE.md_ (frontend will patch status post-tx)
- [ ] Prize leaderboard cache refresh trigger — _ARCHITECTURE.md_

---

## 8. Claim Flow

- [x] Eligibility checks (earned, rank, stock, no prior) — _ARCHITECTURE.md_
- [x] Pending claim slot reservation (insert `pending` row, catch unique-index race) — _ARCHITECTURE.md_
- [x] EIP-712 ClaimVoucher sign (5 min TTL) — _ARCHITECTURE.md_
- [x] Gas estimate returned (~120k) — _API.md_
- [ ] Frontend `PSLPoints.claimTier()` — _ARCHITECTURE.md_
- [ ] `TierClaimed` + `TrophyMinted` observers → DB confirm — _ARCHITECTURE.md_
- [x] Fulfillment status `pending_shipping` default (`claim.fulfillment_status='none'` initially, set post-confirm) — _API.md / DATA_MODEL.md_

---

## 9. Leaderboard Caching & Indexing

- [ ] Global: DB window rank query by `user_point.total_points DESC` — _DATA_MODEL.md_
- [ ] Prize snapshot schema extended (`wallet_balance` column) — _DATA_MODEL.md_
- [ ] `tracked_wallet` table + upsert on voucher issuance (sync/claim routes) — _ARCHITECTURE.md_
- [ ] `indexer_cursor` table initialized at deploy block — _ARCHITECTURE.md_
- [ ] Lazy-refresh handler inside `GET /api/leaderboard/prize`:
  - [ ] Stale-check (`MAX(refreshed_at) > now() - 30s`) — _ARCHITECTURE.md_
  - [ ] `eth_getLogs` Transfer scan from `last_scanned_block + 1` — _ARCHITECTURE.md_
  - [ ] Upsert discovered wallets into `tracked_wallet` — _ARCHITECTURE.md_
  - [ ] viem multicall: `balanceOf` + `earnedBalance` over all tracked wallets — _ARCHITECTURE.md_
  - [ ] Filter to `earnedBalance >= MIN_EARNED_TO_CLAIM_WEI` (10,000 BNDY — same as on-chain claim gate) — _ARCHITECTURE.md_
  - [ ] Rank by `balanceOf DESC` among qualified wallets — _GAME_DESIGN.md_
  - [ ] Atomic snapshot upsert — _ARCHITECTURE.md_
  - [ ] Advance `indexer_cursor.last_scanned_block` — _ARCHITECTURE.md_
- [ ] Tier band derivation (1/3/10/25/50) from rank among qualified — _GAME_DESIGN.md_
- [ ] `canClaim` flag derivation (rank in tier band + stock + no prior active claim; qualification is implicit since only 10k+ earned wallets appear) — _API.md_
- [ ] Client-side 5s poll on `/leaderboard` page — _ARCHITECTURE.md_

---

## 10. Security (SECURITY.md)

- [ ] Pure-whale blocked at both gates: backend leaderboard filter + on-chain `MIN_EARNED_TO_CLAIM = 10,000 BNDY` — _SECURITY.md_
- [ ] Replay blocked via `usedNonces` — _SECURITY.md_
- [ ] Double-claim blocked (reset + DB unique) — _SECURITY.md_
- [ ] Signer key only in Vercel env, never logged — _SECURITY.md_
- [ ] Front-run blocked (stock at voucher time) — _SECURITY.md_
- [ ] RPC flooding blocked (30s cache) — _SECURITY.md_
- [ ] Zod on every API body — _SECURITY.md_
- [ ] Server re-derives authoritative state (no trusted client numbers) — _SECURITY.md_
- [ ] Admin key on all admin routes — _SECURITY.md_
- [ ] No `tx.origin`; CEI respected; immutable signer + one-shot trophies — _SECURITY.md_
- [-] Rate limiting (v1.5) — _SECURITY.md_

---

## 11. Deployment

### 11.1 Vercel

- [ ] `vercel link` done — _DEPLOYMENT.md_
- [ ] Env vars set (DATABASE*URL, SIGNER_PRIVATE_KEY, ADMIN_API_KEY, AUTH_SECRET, SIWE\*\*, contracts, RPC) — *DEPLOYMENT.md\*
- [ ] `pnpm build` passes — _SETUP.md_
- [ ] `vercel --prod` — _DEPLOYMENT.md_
- [ ] Static assets uploaded (players/, prizes/) — _DEPLOYMENT.md_
- [-] Preview deploys with Neon branching (v1.5) — _DEPLOYMENT.md_

### 11.2 Database

- [ ] Prod connection string (sslmode=require, pgbouncer) — _DEPLOYMENT.md_
- [ ] Schema pushed to prod — _DEPLOYMENT.md_
- [ ] Seeds loaded in prod — _DEPLOYMENT.md_
- [ ] Indexes verified — _DATA_MODEL.md_

### 11.3 Contracts

- [ ] Addresses recorded — _CONTRACTS.md_
- [ ] `setTrophies` confirmed — _CONTRACTS.md_
- [ ] Verified on explorer — _DEPLOYMENT.md_
- [ ] `NEXT_PUBLIC_PSL_POINTS_ADDRESS` / `..._TROPHIES_ADDRESS` set on Vercel — _DEPLOYMENT.md_
- [-] Cron for leaderboard refresh (optional) — _DEPLOYMENT.md_

---

## 12. Demo Preparation

### 12.1 End-to-end flows

- [ ] Local dev boots — _SETUP.md_
- [ ] MetaMask on WireFluid + test WIRE — _SETUP.md_
- [ ] SIWE sign-in → JWT — _ARCHITECTURE.md_
- [ ] Team creation (11 players, cap enforced) — _GAME_DESIGN.md_
- [ ] Admin scores a match → user*point updates — \_GAME_DESIGN.md*
- [ ] Global leaderboard reflects — _API.md_
- [ ] Sync → earnedBalance on-chain — _ARCHITECTURE.md_
- [ ] Prize leaderboard shows user — _API.md_
- [ ] Claim → trophy NFT in wallet — _ARCHITECTURE.md_
- [ ] Trophy visible on wirefluidscan — _API.md_
- [ ] BNDY transfer between wallets (wallet balance updates, earnedBalance does NOT) — _TOKENOMICS.md_
- [ ] Gifted-balance claim attempt reverts (pure-whale mitigation proof — bought tokens count toward balanceOf but not earnedBalance, so claim gate reverts) — _SECURITY.md_

### 12.2 DEMO_TRANSACTIONS.md fill-in

- [x] Contract addresses + explorer links — _DEMO_TRANSACTIONS.md_
- [x] Deploy tx hashes + `setTrophies` tx — _DEMO_TRANSACTIONS.md_
- [x] Backend signer address listed — _DEMO_TRANSACTIONS.md_
- [ ] 2–3 match scoring rows — _DEMO_TRANSACTIONS.md_
- [ ] 3–5 sync tx rows — _DEMO_TRANSACTIONS.md_
- [ ] 2+ claim tx rows (different tiers) — _DEMO_TRANSACTIONS.md_
- [ ] 2+ transfer rows — _DEMO_TRANSACTIONS.md_
- [ ] 1 reverted claim row — _DEMO_TRANSACTIONS.md_
- [ ] Trophy NFT explorer links verified — _DEMO_TRANSACTIONS.md_

### 12.3 Pitch assets

- [ ] Demo video recorded — _PROJECT_TRACKER.md_
- [ ] Pitch deck — _PROJECT_TRACKER.md_
- [ ] README polish pass — _README.md_

---

## 13. Documentation (spec files — already authored)

- [x] `README.md` (root)
- [x] `docs/README.md`
- [x] `docs/SETUP.md`
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/CONTRACTS.md`
- [x] `docs/DATA_MODEL.md`
- [x] `docs/API.md`
- [x] `docs/GAME_DESIGN.md`
- [x] `docs/TOKENOMICS.md`
- [x] `docs/SECURITY.md`
- [x] `docs/DEPLOYMENT.md`
- [x] `docs/WIREFLUID.md`
- [x] `docs/ROADMAP.md`
- [~] `docs/DEMO_TRANSACTIONS.md` filled in post-deploy (contracts + signer done; txs pending demo run)

---

## Snapshot — 2026-04-13

| Area           | State                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Docs (spec)    | ✅ Complete                                                            |
| Monorepo infra | ✅ Scaffolded                                                          |
| Contracts      | ✅ Deployed + verified on WireFluid testnet                            |
| DB schema      | ✅ Migrated + seeded on live Neon (150 players, 5 tiers, 1 tournament) |
| Shared pkg     | ✅ Authored (chain, ABIs, DTOs, vouchers, constants)                   |
| API routes     | ⚠️ Not started                                                         |
| Frontend       | ⚠️ Not started                                                         |
| Deployment     | ⚠️ Not started                                                         |
| Demo artifacts | ⚠️ Not started                                                         |

**Suggested build order:** contracts → DB schema + seeds → shared types/ABIs → API routes → frontend pages (parallel) → deploy → demo transactions.
