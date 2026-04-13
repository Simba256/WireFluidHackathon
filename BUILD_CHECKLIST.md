# BoundaryLine — Master Build Checklist

> Last updated: 2026-04-13 (22:30 PKT)
> Companion to `PROJECT_TRACKER.md`. This file is the **exhaustive** work breakdown pulled from every doc under `docs/`. `PROJECT_TRACKER.md` shows recent activity; this file tracks the full scope from spec → shipped.

**Legend:** `[ ]` = not started · `[~]` = partial / in progress · `[x]` = done · `[-]` = skipped / deferred
**Source** = doc that specifies the item.

---

## 0. Monorepo & Infrastructure

- [x] Root `package.json` with workspaces — *SETUP.md*
- [x] `turbo.json` task graph — *DEPLOYMENT.md*
- [x] `tsconfig.base.json` — *SETUP.md*
- [x] `pnpm-workspace.yaml` — *SETUP.md*
- [x] `.env.example` at root — *SETUP.md*
- [x] `.gitignore` (node_modules, .env.local, .next, artifacts, .turbo) — *SETUP.md*
- [ ] `.env.local` populated (DATABASE_URL, SIGNER_PRIVATE_KEY, ADMIN_API_KEY, AUTH_SECRET, SIWE_*, chain, contract addrs) — *SETUP.md*
- [ ] Neon project created (main branch, connection string) — *SETUP.md / DEPLOYMENT.md*
- [ ] Vercel project linked (`vercel link`) — *DEPLOYMENT.md*
- [ ] `vercel.ts` config (build, framework, headers, crons) — *DEPLOYMENT.md*

---

## 1. Smart Contracts (`packages/contracts`)

### 1.1 Project scaffolding
- [x] Hardhat initialized, `hardhat.config.ts` (Solidity 0.8.24, optimizer 200) — *CONTRACTS.md*
- [x] WireFluid testnet network (chain 92533, RPC, explorer) — *WIREFLUID.md*
- [x] wirefluidscan verification config — *CONTRACTS.md / DEPLOYMENT.md*
- [x] OpenZeppelin v5 installed (ERC20, ERC721, ECDSA, EIP712, AccessControl) — *CONTRACTS.md*
- [x] Scripts: `compile`, `test`, `coverage`, `lint`, `slither`, `deploy:testnet` — *SETUP.md*
- [x] `.env.example` (DEPLOYER_PRIVATE_KEY, SIGNER_ADDRESS, WIREFLUIDSCAN_API_KEY) — *SETUP.md*

### 1.2 `PSLPoints.sol` (ERC-20 BNDY)
- [x] State: `earnedBalance`, `usedNonces`, `trustedSigner` immutable, `trophies` addr, `MIN_EARNED_TO_CLAIM = 10_000e18` — *CONTRACTS.md*
- [x] Events: `Synced`, `TierClaimed`, `TrophiesContractSet` — *CONTRACTS.md*
- [x] `sync(voucher, sig)` — verify EIP-712, mint, bump earnedBalance, mark nonce — *CONTRACTS.md*
- [x] `claimTier(voucher, sig)` — gate on earnedBalance, burn full balance, reset earned, cross-call trophy mint — *CONTRACTS.md*
- [x] `setTrophies(addr)` one-shot admin setter — *CONTRACTS.md*
- [x] EIP-712 domain "BoundaryLine" v1 + `SyncVoucher` / `ClaimVoucher` typed structs — *CONTRACTS.md*
- [x] Standard ERC-20 surface intact (transfer/approve/etc.) — *CONTRACTS.md*

### 1.3 `PSLTrophies.sol` (Soulbound ERC-721)
- [x] State: `minter` immutable, `nextTokenId`, `tokenTier`, `tokenTournamentId`, `tierNames` — *CONTRACTS.md*
- [x] `TrophyMinted` event — *CONTRACTS.md*
- [x] `mintTrophy(winner, tierId, tournamentId)` (minter-only) — *CONTRACTS.md*
- [x] `tokenURI` returns inline SVG + JSON data URI — *CONTRACTS.md*
- [x] `_update` override blocks all transfers (soulbound) — *CONTRACTS.md*

### 1.4 Tests (Hardhat + Chai, >90% cov)
- [x] Sync: correct mint + earned increment — *CONTRACTS.md*
- [x] Sync: replayed nonce reverts — *CONTRACTS.md*
- [x] Sync: bad signature reverts — *CONTRACTS.md*
- [x] Sync: zero amount reverts — *CONTRACTS.md*
- [x] Transfers move `balanceOf` but NOT `earnedBalance` — *CONTRACTS.md / SECURITY.md*
- [x] Claim below `MIN_EARNED_TO_CLAIM` reverts — *CONTRACTS.md*
- [x] Claim: replayed nonce reverts — *CONTRACTS.md*
- [x] Claim: bad signature reverts — *CONTRACTS.md*
- [x] Claim burns full wallet balance (including gifted excess) — *CONTRACTS.md*
- [x] Claim resets `earnedBalance` to 0 — *CONTRACTS.md*
- [x] Claim mints trophy cross-call — *CONTRACTS.md*
- [x] Second claim blocked by reset — *CONTRACTS.md*
- [x] `setTrophies` is one-shot — *CONTRACTS.md*
- [x] Trophies: only minter mints — *CONTRACTS.md*
- [x] Trophies: transfers always revert — *CONTRACTS.md*
- [x] Trophies: `tokenURI` valid data URI, correct metadata — *CONTRACTS.md*
- [x] Slither: zero high/medium — *SECURITY.md*
- [x] solhint clean — *SECURITY.md*

### 1.5 Deployment
- [x] `deploy.ts` script (PSLPoints → PSLTrophies → setTrophies) — *CONTRACTS.md*
- [x] Deployed to WireFluid testnet — *DEPLOYMENT.md*
- [x] Addresses + ABIs saved to `deployments/wirefluid-testnet.json` — *CONTRACTS.md*
- [x] Verified on wirefluidscan.com — *DEPLOYMENT.md*
- [ ] Backend signer funded with test WIRE — *SETUP.md*

---

## 2. Database (`packages/db`)

### 2.1 Drizzle schema tables
- [x] `user` (wallet PK, siwe_nonce, display_name, timestamps) — *DATA_MODEL.md*
- [x] `player` (id, external_id unique, name, team, role, base_price, photo_url, active) — *DATA_MODEL.md*
- [x] `match` (id, tournament_id, team_a, team_b, scheduled_at, status, played_at) — *DATA_MODEL.md*
- [x] `player_score` (match_id, player_id, runs, wickets, catches, run_outs, stumpings, dismissed_for_zero, points_awarded) — *DATA_MODEL.md*
- [x] `team` (id, user_wallet, tournament_id, total_credits) — *DATA_MODEL.md*
- [x] `team_player` (team_id, player_id composite PK) — *DATA_MODEL.md*
- [x] `user_point` (wallet, tournament_id, total_points, last_match_id) — *DATA_MODEL.md*
- [x] `synced_record` (wallet, amount, nonce, tx_hash, block_number, status, voucher_expires_at) — *DATA_MODEL.md*
- [x] `claim` (wallet, tier_id, nonce, tx_hash, trophy_token_id, fulfillment_status, status) — *DATA_MODEL.md*
- [x] `prize` (tournament_id, tier_id, name, desc, image, stock_limit, rank_required) — *DATA_MODEL.md*
- [x] `prize_leaderboard_snapshot` (wallet, tournament_id, earned_balance, rank, snapshot_block) — *DATA_MODEL.md*
- [x] `tournament` (id, name, status, started/closed/grace timestamps) — *DATA_MODEL.md*
- [x] `admin_session` (optional) — *DATA_MODEL.md*

### 2.2 Indexes & constraints
- [x] Wallet CHECK constraint (lowercase 0x…) — *DATA_MODEL.md*
- [x] `player`: unique external_id, idx team, idx role — *DATA_MODEL.md*
- [x] `match`: idx (tournament_id, status) — *DATA_MODEL.md*
- [x] `player_score`: unique (match_id, player_id), idx player_id — *DATA_MODEL.md*
- [x] `team`: unique (user_wallet, tournament_id) — *DATA_MODEL.md*
- [x] `user_point`: idx (tournament_id, total_points DESC) — *DATA_MODEL.md*
- [x] `synced_record`: unique nonce, idx (wallet, tournament_id) — *DATA_MODEL.md*
- [x] `claim`: unique nonce, unique (wallet, tournament_id) partial — *DATA_MODEL.md*
- [x] `prize`: unique (tournament_id, tier_id) — *DATA_MODEL.md*
- [x] `prize_leaderboard_snapshot`: idx (tournament_id, rank) — *DATA_MODEL.md*

### 2.3 Migrations & seeds
- [x] Drizzle migration 0001 generated — *DATA_MODEL.md*
- [x] `players.json` seed (~150 PSL 2026 players) — *DATA_MODEL.md / GAME_DESIGN.md*
- [x] `prizes.json` seed (5 tiers × stock 1/3/10/25/50) — *DATA_MODEL.md / GAME_DESIGN.md*
- [x] Tournament row seed — *DATA_MODEL.md*
- [x] `db:push`, `db:migrate`, `db:seed`, `db:studio` scripts — *SETUP.md*

### 2.4 Query helpers
- [x] Point calculation helper — *GAME_DESIGN.md*
- [x] Global leaderboard rank query — *DATA_MODEL.md*
- [x] Tier stock count helper — *DATA_MODEL.md*

---

## 3. Shared Package (`packages/shared`)

- [ ] `wirefluid.ts` viem `defineChain` — *WIREFLUID.md*
- [ ] wagmi config export — *WIREFLUID.md*
- [ ] Chain constants (id, rpc, explorer, faucet) — *WIREFLUID.md*
- [ ] `PSLPoints` ABI export — *CONTRACTS.md*
- [ ] `PSLTrophies` ABI export — *CONTRACTS.md*
- [ ] Contract TS types (typechain or viem) — *CONTRACTS.md*
- [ ] `SyncVoucher` / `ClaimVoucher` TS types — *ARCHITECTURE.md*
- [ ] User / Player / Team / Match / Prize / Leaderboard DTOs — *API.md*
- [ ] Error type `{ error, code }` — *API.md*
- [ ] Game constants (SALARY_CAP, MIN_EARNED, TEAM_SIZE, tier stocks, formula multipliers) — *GAME_DESIGN.md*

---

## 4. Backend API (`apps/web/app/api`)

### 4.1 Auth
- [ ] `GET /api/auth/nonce` — *API.md*
- [ ] `POST /api/auth/verify` (SIWE → JWT, upsert user) — *API.md*
- [ ] `POST /api/auth/logout` (JWT blacklist) — *API.md*

### 4.2 Players & Teams
- [ ] `GET /api/players` (cached 1h) — *API.md*
- [ ] `POST /api/teams` (validate 11 players, salary cap, no dup, no existing team) — *API.md*
- [ ] `GET /api/teams/me` — *API.md*

### 4.3 Points & Sync
- [ ] `GET /api/points/me` (earned, onChainEarned, walletBalance, unsynced, ranks, tier, canClaim) — *API.md*
- [ ] `POST /api/sync` (delta, nonce, EIP-712 sign, pending record, expires) — *API.md*

### 4.4 Claims
- [ ] `POST /api/claim` (earned gate, rank check, stock reserve, voucher) — *API.md*
- [ ] `GET /api/claim/status` — *API.md*

### 4.5 Leaderboards
- [ ] `GET /api/leaderboard/global` (paginated, `around` param) — *API.md*
- [ ] `GET /api/leaderboard/prize` (snapshot-backed, 30s refresh) — *API.md*

### 4.6 Prizes & Trophies
- [ ] `GET /api/prizes` (tiers + live stock) — *API.md*
- [ ] `GET /api/trophies/:wallet` (on-chain read) — *API.md*

### 4.7 Admin
- [ ] `POST /api/admin/matches` — *API.md*
- [ ] `POST /api/admin/matches/:id/scores` (compute points, update user_point) — *API.md*
- [ ] `POST /api/admin/tournaments/:id/close` (grace period) — *API.md*

### 4.8 Infra helpers
- [ ] SIWE parse/verify util — *SETUP.md*
- [ ] JWT issue/verify — *SETUP.md*
- [ ] EIP-712 signer util (viem/ethers) — *ARCHITECTURE.md*
- [ ] Drizzle query helpers — *SETUP.md*
- [ ] viem read clients for PSLPoints / PSLTrophies — *ARCHITECTURE.md*
- [ ] Zod validation middleware — *API.md / SECURITY.md*
- [ ] Standardized error responses — *API.md*
- [-] Rate limiting (v1.5) — *SECURITY.md*

---

## 5. Frontend (`apps/web`)

### 5.1 Setup
- [ ] Tailwind config — *README.md*
- [ ] shadcn/ui init + core components — *README.md*
- [ ] Global styles / tokens — *README.md*
- [ ] wagmi + viem + RainbowKit (or equivalent) wired to WireFluid — *WIREFLUID.md*

### 5.2 Marketing pages
- [ ] `/` landing (hero, pitch, connect CTA) — *README.md*
- [ ] `/how-it-works` — *README.md*
- [ ] `/about` — *README.md*

### 5.3 App pages
- [ ] `/dashboard` (earned, synced, wallet balance, unsynced, sync button, rank, tier) — *API.md / GAME_DESIGN.md*
- [ ] `/play` team picker (search, filters, salary cap, 11-slot submit) — *GAME_DESIGN.md*
- [ ] `/leaderboard` (global + prize tabs) — *API.md*
- [ ] `/prizes` (tier cards, stock, claim) — *GAME_DESIGN.md*
- [ ] `/trophies` (user's soulbound NFTs) — *API.md*

### 5.4 Admin
- [ ] `/admin` key auth + match CRUD + score entry form — *API.md*

### 5.5 Components
- [ ] ConnectWallet button — *ARCHITECTURE.md*
- [ ] Chain guard / switcher — *WIREFLUID.md*
- [ ] PlayerCard — *GAME_DESIGN.md*
- [ ] TeamGrid (11 slots + cap bar) — *GAME_DESIGN.md*
- [ ] SalaryCapCalculator — *GAME_DESIGN.md*
- [ ] LeaderboardRow — *API.md*
- [ ] TierCard — *GAME_DESIGN.md*
- [ ] TrophyNFT display — *API.md*
- [ ] TransactionStatus (tx hash → explorer) — *ARCHITECTURE.md*
- [ ] Error message components — *API.md*

### 5.6 Hooks
- [ ] `useAuth` — *ARCHITECTURE.md*
- [ ] `useTeam` — *ARCHITECTURE.md*
- [ ] `usePoints` — *ARCHITECTURE.md*
- [ ] `useLeaderboard` — *ARCHITECTURE.md*
- [ ] `usePrizes` — *ARCHITECTURE.md*
- [ ] `useTrophies` — *ARCHITECTURE.md*
- [ ] `useWalletSync` — *ARCHITECTURE.md*
- [ ] `useClaimTier` — *ARCHITECTURE.md*
- [ ] `useChainGuard` — *WIREFLUID.md*

### 5.7 Polish (v1.5)
- [-] Full responsive pass — *ROADMAP.md*
- [-] Accessibility pass — *ROADMAP.md*

---

## 6. Scoring Engine

- [ ] Formula: `runs + wickets*25 + catches*10 + run_outs*10 + stumpings*10 + bonuses - penalties` — *GAME_DESIGN.md*
- [ ] Bonuses: 50+ runs (+20), 100+ runs (+50), 5+ wkts (+50) — *GAME_DESIGN.md*
- [ ] Penalty: duck (-5) — *GAME_DESIGN.md*
- [ ] Team score = sum of 11 players — *GAME_DESIGN.md*
- [ ] User total accumulates across matches — *GAME_DESIGN.md*
- [ ] Atomic update on score submission — *DATA_MODEL.md*

---

## 7. Sync Flow

- [ ] Backend computes `delta = totalEarned − onChainEarned` — *ARCHITECTURE.md*
- [ ] Unique nonce generation — *ARCHITECTURE.md*
- [ ] EIP-712 voucher sign (5 min TTL) — *ARCHITECTURE.md*
- [ ] Gas estimate returned (~70k) — *API.md*
- [ ] Frontend `PSLPoints.sync()` via wagmi — *ARCHITECTURE.md*
- [ ] `Synced` event observer → DB confirm — *ARCHITECTURE.md*
- [ ] Prize leaderboard cache refresh trigger — *ARCHITECTURE.md*

---

## 8. Claim Flow

- [ ] Eligibility checks (earned, rank, stock, no prior) — *ARCHITECTURE.md*
- [ ] Pending claim slot reservation — *ARCHITECTURE.md*
- [ ] EIP-712 ClaimVoucher sign (5 min TTL) — *ARCHITECTURE.md*
- [ ] Gas estimate returned (~120k) — *API.md*
- [ ] Frontend `PSLPoints.claimTier()` — *ARCHITECTURE.md*
- [ ] `TierClaimed` + `TrophyMinted` observers → DB confirm — *ARCHITECTURE.md*
- [ ] Fulfillment status `pending_shipping` — *API.md / DATA_MODEL.md*

---

## 9. Leaderboard Caching

- [ ] Global: DB window rank — *DATA_MODEL.md*
- [ ] Prize: snapshot table, 30s refresh — *ARCHITECTURE.md*
- [ ] viem multicall over all synced wallets — *ARCHITECTURE.md*
- [ ] `snapshot_block` tracking — *DATA_MODEL.md*
- [ ] Tier band derivation (1/3/10/25/50) — *GAME_DESIGN.md*

---

## 10. Security (SECURITY.md)

- [ ] Pay-to-win blocked via `earnedBalance` — *SECURITY.md*
- [ ] Replay blocked via `usedNonces` — *SECURITY.md*
- [ ] Double-claim blocked (reset + DB unique) — *SECURITY.md*
- [ ] Signer key only in Vercel env, never logged — *SECURITY.md*
- [ ] Front-run blocked (stock at voucher time) — *SECURITY.md*
- [ ] RPC flooding blocked (30s cache) — *SECURITY.md*
- [ ] Zod on every API body — *SECURITY.md*
- [ ] Server re-derives authoritative state (no trusted client numbers) — *SECURITY.md*
- [ ] Admin key on all admin routes — *SECURITY.md*
- [ ] No `tx.origin`; CEI respected; immutable signer + one-shot trophies — *SECURITY.md*
- [-] Rate limiting (v1.5) — *SECURITY.md*

---

## 11. Deployment

### 11.1 Vercel
- [ ] `vercel link` done — *DEPLOYMENT.md*
- [ ] Env vars set (DATABASE_URL, SIGNER_PRIVATE_KEY, ADMIN_API_KEY, AUTH_SECRET, SIWE_*, contracts, RPC) — *DEPLOYMENT.md*
- [ ] `pnpm build` passes — *SETUP.md*
- [ ] `vercel --prod` — *DEPLOYMENT.md*
- [ ] Static assets uploaded (players/, prizes/) — *DEPLOYMENT.md*
- [-] Preview deploys with Neon branching (v1.5) — *DEPLOYMENT.md*

### 11.2 Database
- [ ] Prod connection string (sslmode=require, pgbouncer) — *DEPLOYMENT.md*
- [ ] Schema pushed to prod — *DEPLOYMENT.md*
- [ ] Seeds loaded in prod — *DEPLOYMENT.md*
- [ ] Indexes verified — *DATA_MODEL.md*

### 11.3 Contracts
- [ ] Addresses recorded — *CONTRACTS.md*
- [ ] `setTrophies` confirmed — *CONTRACTS.md*
- [ ] Verified on explorer — *DEPLOYMENT.md*
- [ ] `NEXT_PUBLIC_PSL_POINTS_ADDRESS` / `..._TROPHIES_ADDRESS` set on Vercel — *DEPLOYMENT.md*
- [-] Cron for leaderboard refresh (optional) — *DEPLOYMENT.md*

---

## 12. Demo Preparation

### 12.1 End-to-end flows
- [ ] Local dev boots — *SETUP.md*
- [ ] MetaMask on WireFluid + test WIRE — *SETUP.md*
- [ ] SIWE sign-in → JWT — *ARCHITECTURE.md*
- [ ] Team creation (11 players, cap enforced) — *GAME_DESIGN.md*
- [ ] Admin scores a match → user_point updates — *GAME_DESIGN.md*
- [ ] Global leaderboard reflects — *API.md*
- [ ] Sync → earnedBalance on-chain — *ARCHITECTURE.md*
- [ ] Prize leaderboard shows user — *API.md*
- [ ] Claim → trophy NFT in wallet — *ARCHITECTURE.md*
- [ ] Trophy visible on wirefluidscan — *API.md*
- [ ] BNDY transfer between wallets (wallet balance updates, earnedBalance does NOT) — *TOKENOMICS.md*
- [ ] Gifted-balance claim attempt reverts (pay-to-win mitigation proof) — *SECURITY.md*

### 12.2 DEMO_TRANSACTIONS.md fill-in
- [x] Contract addresses + explorer links — *DEMO_TRANSACTIONS.md*
- [x] Deploy tx hashes + `setTrophies` tx — *DEMO_TRANSACTIONS.md*
- [x] Backend signer address listed — *DEMO_TRANSACTIONS.md*
- [ ] 2–3 match scoring rows — *DEMO_TRANSACTIONS.md*
- [ ] 3–5 sync tx rows — *DEMO_TRANSACTIONS.md*
- [ ] 2+ claim tx rows (different tiers) — *DEMO_TRANSACTIONS.md*
- [ ] 2+ transfer rows — *DEMO_TRANSACTIONS.md*
- [ ] 1 reverted claim row — *DEMO_TRANSACTIONS.md*
- [ ] Trophy NFT explorer links verified — *DEMO_TRANSACTIONS.md*

### 12.3 Pitch assets
- [ ] Demo video recorded — *PROJECT_TRACKER.md*
- [ ] Pitch deck — *PROJECT_TRACKER.md*
- [ ] README polish pass — *README.md*

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

| Area | State |
|---|---|
| Docs (spec) | ✅ Complete |
| Monorepo infra | ✅ Scaffolded |
| Contracts | ✅ Deployed + verified on WireFluid testnet |
| DB schema | ✅ Schema + migration + seeds authored (live Neon push pending) |
| Shared pkg | ⚠️ Not started |
| API routes | ⚠️ Not started |
| Frontend | ⚠️ Not started |
| Deployment | ⚠️ Not started |
| Demo artifacts | ⚠️ Not started |

**Suggested build order:** contracts → DB schema + seeds → shared types/ABIs → API routes → frontend pages (parallel) → deploy → demo transactions.
