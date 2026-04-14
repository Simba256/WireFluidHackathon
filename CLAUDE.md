# BoundaryLine — Project Instructions for Claude

> Fantasy PSL game on WireFluid testnet. Hackathon build (2026-04-13 → 2026-04-14).
> This file overrides global defaults for work inside this repo. Read it in full at the start of every session.

---

## 1. What this project is

**BoundaryLine** is a free-to-play fantasy cricket game for the Pakistan Super League (PSL 2026), deployed on WireFluid testnet (chain ID `92533`). Players pick 11-player teams, earn points from real match performance, sync those points on-chain as **BNDY** (ERC-20), and claim real-world prizes via **soulbound trophy NFTs**.

**Hybrid architecture:** gameplay + scoring are off-chain (Postgres) for speed and zero gas; sync, claim, and trophy mint are on-chain for trust and verifiability.

**Single source of truth for the spec:** the 13 files under `docs/`. Treat them as authoritative. If something isn't in the docs, the docs are wrong — update them first.

---

## 2. Tracking files — read both, update both

This project uses two tracking files. They are **not** redundant.

### `PROJECT_TRACKER.md` — the dashboard

- **Purpose**: current, recent, and near-term activity. Living snapshot, not history.
- **Read when**: starting a session.
- **Update when**: you start a task, finish a task, hit a blocker, make a decision worth logging, or change project status.
- **Format rules**: absolute dates (YYYY-MM-DD), ~10 recent completions max, roll older items off. Dashboard, not a journal.

### `BUILD_CHECKLIST.md` — the master scope

- **Purpose**: exhaustive spec-derived checklist covering every item from `docs/*.md`. Tracks scope from spec → shipped across 13 sections (infra, contracts, DB, shared, API, frontend, scoring, sync, claim, leaderboard, security, deployment, demo).
- **Read when**: planning work, scoping a feature, checking what's left in an area, verifying nothing was missed.
- **Update when**: any checklist item changes state. Flip `[ ]` → `[~]` when starting, `[~]` → `[x]` when done. Add new items if scope genuinely grows (and cite the doc).

### MANDATORY: update both after every task

After completing _any_ unit of work — however small:

1. Flip the relevant box(es) in `BUILD_CHECKLIST.md`.
2. Move the item in `PROJECT_TRACKER.md` (In Progress → Recently Completed, today's date).
3. If new work surfaced, add it to both files.

Never end a session with these two files out of sync with reality.

---

## 3. Repo layout

```
WireFluid/
├── apps/
│   └── web/                 # Next.js App Router — pages + API route handlers (single deploy)
├── packages/
│   ├── contracts/           # Hardhat — PSLPoints.sol, PSLTrophies.sol, tests, deploy scripts
│   ├── db/                  # Drizzle schema, migrations, seeds
│   └── shared/              # viem chain def, ABIs, TS types, constants, EIP-712 voucher types
├── docs/                    # 13-file spec (authoritative)
├── data/                    # Seed JSON (players, prizes)
├── PROJECT_TRACKER.md       # Dashboard
├── BUILD_CHECKLIST.md       # Master scope
└── CLAUDE.md                # This file
```

Stack: **pnpm + Turborepo**, **Next.js 16 App Router** (Fluid Compute on Vercel), **Hardhat + Solidity 0.8.24 + OpenZeppelin v5**, **Drizzle + Neon Postgres**, **wagmi v2 + viem**, **SIWE + JWT**, **Tailwind + shadcn/ui**.

---

## 4. WireFluid testnet — platform constants

|                 |                                |
| --------------- | ------------------------------ |
| Chain ID        | `92533`                        |
| RPC             | `https://evm.wirefluid.com`    |
| Explorer        | `https://wirefluidscan.com`    |
| Faucet          | `https://faucet.wirefluid.com` |
| Native currency | WIRE                           |
| Finality        | ~5s                            |
| Gas (sync)      | ~$0.0005                       |
| Gas (claim)     | ~$0.001                        |

Never hard-code these outside `packages/shared` — import from the shared chain config.

---

## 5. Locked design decisions (do not relitigate)

Recorded in `PROJECT_TRACKER.md` "Key Decisions". Reiterated here because these are load-bearing:

- **Play-to-qualify, pay-to-rank, earn-to-win** (updated 2026-04-14) — BoundaryLine ranks wallets by `balanceOf` (transferable wallet balance) so trading, gifting, and DEX activity are real game mechanics. A single earned-balance threshold blocks the abuse case:
  - **Qualification + claim threshold**: `earnedBalance >= 10,000 BNDY` — a wallet with less than 10k earned never appears on the leaderboard regardless of `balanceOf`, AND the contract reverts any `claimTier()` attempt. Enforced in two places (backend filter + `PSLPoints.claimTier()` compile-time constant) that read the same on-chain number.
  - Once a wallet crosses the 10k earned threshold, it is both visible on the leaderboard and eligible to claim. Trading, gifting, and buying BNDY can then move its rank (since rank is `balanceOf`-based) but never affect qualification (which is `earnedBalance`-based).
  - Pure whales with zero earned are blocked from both leaderboard visibility and prize claims by the same check. Pay-to-rank is a feature; pay-to-qualify is impossible.
  - **Do not lower the 10k threshold without redeploying the contract.** The `MIN_EARNED_TO_CLAIM` constant in `PSLPoints.sol` is compile-time.
- **Soulbound trophy NFTs** — `PSLTrophies._update` reverts on all non-mint transfers. Trophies prove achievement; making them tradable would let anyone fake "Top 10 Finisher" status.
- **Dual leaderboard** — Global off-chain (inclusive, engagement) + Prize on-chain (authoritative, prize distribution). Only the prize leaderboard determines winners.
- **One claim per user per tournament, current tier only** — creates press-your-luck tension; blocks downgrade exploits.
- **Off-chain accumulation, opt-in on-chain sync** — zero gas for gameplay.
- **Free-to-play, gas-only** — avoids gambling classification. No entry fees, no fiat rails.
- **No indexer daemon, single Vercel deploy** (added 2026-04-13) — Vercel Hobby crons are daily-only, so the prize leaderboard uses lazy refresh on `GET /api/leaderboard/prize`: stale-check → multicall + Transfer-log scan → snapshot upsert → return. Client polls every 5s for UI freshness. See `docs/ARCHITECTURE.md` §Indexing Strategy. A realtime indexer on Railway/Fly is a v2 upgrade, not a v1 requirement.

If a change seems to contradict any of these, stop and ask.

---

## 6. Coding standards

### General

- TypeScript everywhere. No `any` unless unavoidable and commented with _why_.
- Zod validation at every external boundary (API request bodies, env parsing, external API responses). Never trust internal code boundaries.
- Server re-derives authoritative state. **Never** trust client-submitted points, ranks, eligibility, or tier bands.
- No hardcoded secrets. Env vars via `packages/shared` typed env loader.
- No hardcoded magic numbers. Constants live in `packages/shared/constants.ts` (MIN_EARNED_TO_CLAIM_WEI, TEAM_SIZE, tier stocks, formula multipliers).
- Handle errors explicitly at boundaries; trust internal code.
- Write testable code: pure functions, dependency injection for contract/DB clients.
- Self-documenting names over comments. Comments only explain _why_, not _what_.

### Next.js / frontend (apps/web)

- **App Router** only. Server Components by default; Client Components only when you need state, effects, or wallet hooks.
- API routes under `app/api/*/route.ts` — Fluid Compute runtime (Node.js, not edge).
- Standard error shape: `{ error: string, code: string }` on every non-2xx — match `docs/API.md`.
- wagmi + viem only for chain interaction. No ethers.js in frontend code.
- No `unstable_cache` — use Next.js 16 `cacheLife` / `cacheTag` / `updateTag` patterns where caching is needed.
- Tailwind + shadcn/ui only. No other UI libraries. Follow Impeccable design principles (no gray on color, tinted neutrals, no nested cards, avoid Inter/Arial unless asked).

### Smart contracts (packages/contracts)

- Solidity `0.8.24`, optimizer runs `200`, OpenZeppelin v5.
- No `tx.origin`, ever. Use `msg.sender`.
- Checks-Effects-Interactions pattern on every state-changing function.
- EIP-712 typed data for vouchers. Domain name `"BoundaryLine"`, version `"1"`.
- `trustedSigner` **immutable**. `setTrophies` **one-shot** (reverts if already set).
- `usedNonces` mapping for replay protection on every voucher consumer.
- All events indexed appropriately (user, nonce, tokenId).
- Tests with Hardhat + Chai. `>90%` line coverage target. Slither clean (zero high/medium). solhint clean.
- Never log signer private keys. Deploy artifacts go to `packages/contracts/deployments/wirefluid-testnet.json`.

### Database (packages/db)

- Drizzle schema in `src/schema.ts`. Migrations committed to repo.
- Wallet addresses stored **lowercase `0x...`** with CHECK constraint. Normalize on write.
- Indexes as spec'd in `docs/DATA_MODEL.md` — leaderboard queries depend on them.
- Atomic updates for `user_point.total_points` and `claim` slot reservations (use transactions).
- Unique partial index on `claim(wallet, tournament_id) WHERE status IN ('pending', 'confirmed')` to block double-claims at DB level.

### API (apps/web/app/api)

- Every route handler: (1) Zod-validate input, (2) auth check (SIWE JWT or admin key), (3) business logic, (4) standard error shape on failure.
- Admin routes gated by `X-Admin-Key` header against `ADMIN_API_KEY` env.
- SIWE JWT in `Authorization: Bearer <token>` header on all user-scoped routes.
- Error codes match `docs/API.md` exactly: `SIWE_INVALID`, `NONCE_MISMATCH`, `INVALID_TEAM_SIZE`, `DUPLICATE_PLAYER`, `TEAM_EXISTS`, `NO_TEAM`, `NOTHING_TO_SYNC`, `UNAUTHORIZED`, `BELOW_THRESHOLD`, `WRONG_TIER`, `NO_STOCK`, `ALREADY_CLAIMED`.

---

## 7. Security — non-negotiable invariants

From `docs/SECURITY.md`. Any change touching these needs a corresponding test and a mention in the PR:

1. **Pure-whale capture is impossible at both gates**: the leaderboard snapshot query filters to `earnedBalance >= 10,000 BNDY` (backend), and `PSLPoints.claimTier()` enforces the same `earnedBalance >= 10,000 BNDY` on-chain. A wallet below this threshold never appears on the leaderboard and cannot claim. Purchased/received tokens count toward `balanceOf` (rank) but not toward `earnedBalance` (qualification).
2. **Replay is impossible**: `usedNonces[nonce]` marked before any state change in `sync()` and `claimTier()`.
3. **Double-claim is impossible**: `earnedBalance` reset to 0 on claim + DB unique partial index on active claims.
4. **Voucher TTL = 5 minutes**: backend stores `voucher_expires_at`; stale pending records get released.
5. **Signer key never leaves Vercel env**: never logged, never returned to clients, never committed. Stored as `SIGNER_PRIVATE_KEY`.
6. **Front-running on scarce tiers blocked**: stock reserved at voucher-issue time via pending DB row, not at tx-confirm time.
7. **Server-side validation everywhere**: Zod on every body, server re-derives all authoritative values. `earnedBalance` and `balanceOf` always read from contract, never from a client-submitted number.
8. **No `tx.origin`, CEI respected, signer immutable, trophies one-shot.**

---

## 8. Core data flows (memorize)

### Sync (off-chain points → on-chain BNDY)

1. User clicks Sync on dashboard
2. `POST /api/sync` → backend computes `delta = totalEarned - onChainEarned`
3. Backend generates nonce, signs EIP-712 `SyncVoucher { user, amount, nonce }`, stores `synced_record` (status=pending, expires in 5min)
4. Frontend calls `PSLPoints.sync(voucher, signature)` via wagmi
5. Contract verifies sig, marks nonce used, mints BNDY, increments `earnedBalance`, emits `Synced`
6. Backend observes event → updates `synced_record` to confirmed, refreshes prize leaderboard snapshot

### Claim (earned points → prize + trophy)

1. User picks eligible tier on prizes page
2. `POST /api/claim { tierId }` → backend checks: `earnedBalance >= 10_000e18`, rank in tier band, stock available, no prior active claim
3. Backend inserts pending `claim` row (reserves slot), signs EIP-712 `ClaimVoucher { user, tierId, nonce }`, TTL 5min
4. Frontend calls `PSLPoints.claimTier(voucher, signature)`
5. Contract verifies sig + nonce + `earnedBalance` gate, burns full wallet balance, resets `earnedBalance` to 0, cross-calls `PSLTrophies.mintTrophy()`, emits `TierClaimed` + `TrophyMinted`
6. Backend observes events → updates `claim` to confirmed + trophy_token_id, sets `fulfillment_status='pending_shipping'`

Full detail: `docs/ARCHITECTURE.md` §Core Data Flows, `docs/API.md`.

---

## 9. Project data containment

All project data lives **inside** the repo. Nothing in system root, home, or anywhere outside `WireFluid/`:

- `.venv`, `node_modules`, build artifacts, logs, caches, uploaded files, PID/lock files — all project-local.
- Never `pip install` globally, never write outside project dir, always use relative paths or project-rooted absolute paths.
- Override any tool default that writes outside (e.g., `--prefix`, `--target`).
- Hardhat artifacts, Drizzle temp files, `.turbo`, `.next`, `node_modules` — all gitignored and project-local.

---

## 10. Workflow

### Starting a session

1. Read `PROJECT_TRACKER.md` (current state).
2. Read `BUILD_CHECKLIST.md` (scope of any area you'll touch).
3. Read the relevant doc(s) under `docs/` for the task area.

### During a task

- Do exactly what was asked. No "while I'm here" bonus work, no unsolicited refactors, no speculative abstractions.
- If uncertain, ask. Don't silently make architectural decisions.
- Run tests for the affected package before declaring done. If tests don't exist, write them.
- Keep commits scoped and descriptive. No Claude/Anthropic attribution in commits, PRs, messages, or any generated content.

### Finishing a task

1. Tests pass.
2. Update **both** `PROJECT_TRACKER.md` and `BUILD_CHECKLIST.md`.
3. Commit and push (only when explicitly asked or when finishing a requested unit of work).
4. If the user explicitly asked for a fix/feature, one complete unit = fix + commit + push.

### Risky actions — always confirm first

- Destructive git (`reset --hard`, force push, branch -D)
- Schema-destructive DB ops (dropping tables, destructive migrations on prod)
- Deploying contracts or re-running `setTrophies`
- Pushing to prod Vercel
- Any action that touches shared state or is hard to reverse

Authorization is scoped to what was asked. A green light once is not a green light always.

---

## 11. Testing expectations

| Area         | Framework                                                                        | Bar                                              |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Contracts    | Hardhat + Chai                                                                   | >90% line coverage, Slither clean, solhint clean |
| DB / scoring | Vitest or Jest with a real Neon branch                                           | Every point-formula edge case                    |
| API routes   | Route handler integration tests                                                  | All error codes exercised                        |
| Frontend     | Playwright smoke tests on golden-path flows (SIWE → team → score → sync → claim) | Before declaring "demo ready"                    |

If you touch UI, start the dev server and manually verify the flow in a browser. Type checks and unit tests verify code correctness, not feature correctness — say so explicitly if you can't test visually.

---

## 12. Out of scope for v1 (do not build unless asked)

From `docs/ROADMAP.md`:

- P2P point exchange / fixed-price prize catalog
- Real-world prize fulfillment webhooks
- Merkle-root commitments for scoring (v2)
- Multi-tournament support, multi-sport, multi-language
- Rate limiting (deferred to v1.5)
- Preview deploys with Neon DB branching (v1.5)
- Full responsive + accessibility passes (v1.5)
- Cross-chain IBC prize redemption (v2)

---

## 13. Quick reference

| Need                         | File                        |
| ---------------------------- | --------------------------- |
| Current tasks                | `PROJECT_TRACKER.md`        |
| Full scope / what's left     | `BUILD_CHECKLIST.md`        |
| System design + data flows   | `docs/ARCHITECTURE.md`      |
| Contract specs               | `docs/CONTRACTS.md`         |
| DB schema + indexes          | `docs/DATA_MODEL.md`        |
| API endpoints + error codes  | `docs/API.md`               |
| Game rules + scoring formula | `docs/GAME_DESIGN.md`       |
| Token model + invariants     | `docs/TOKENOMICS.md`        |
| Threat model + mitigations   | `docs/SECURITY.md`          |
| Deploy runbook               | `docs/DEPLOYMENT.md`        |
| Chain config                 | `docs/WIREFLUID.md`         |
| v1.5 / v2 roadmap            | `docs/ROADMAP.md`           |
| Local dev setup              | `docs/SETUP.md`             |
| Demo tx log (post-deploy)    | `docs/DEMO_TRANSACTIONS.md` |
