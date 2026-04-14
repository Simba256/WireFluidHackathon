# Architecture

> System design for BoundaryLine — how the pieces fit together.

---

## Why WireFluid

We target **WireFluid testnet** (chain ID `92533`) specifically because its properties map directly onto BoundaryLine's critical path:

- **~5 second economic finality** — the claim tx confirms while the user is still watching the success screen. No "wait for 12 confirmations" UX.
- **Stable, cheap gas** (~$0.0005 sync, ~$0.001 claim) — our free-to-play promise only holds if gas is a non-event. Ethereum mainnet or a congested L2 would break the model.
- **Full EVM compatibility** — we write standard Solidity 0.8.24 + OpenZeppelin v5, deploy with Hardhat, build UIs with wagmi + viem. Zero platform lock-in.
- **Cosmos SDK + IBC** — unlocks the v2 cross-chain prize redemption story through 50+ app-chains without custom bridges.

Full platform reference: [`WIREFLUID.md`](./WIREFLUID.md).

## High-Level Overview

BoundaryLine is a **hybrid on-chain / off-chain** application. Gameplay and scoring happen off-chain for speed and zero gas. Prize-critical operations (sync, claim, trophy mint) happen on-chain for trust and verifiability.

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│                      (web browser)                          │
└──────────────────┬───────────────────┬──────────────────────┘
                   │                   │
        HTTPS (SIWE JWT)      WalletConnect / injected
                   │                   │
                   ▼                   ▼
┌──────────────────────────────┐   ┌────────────────────────┐
│     Next.js App (Vercel)     │   │     MetaMask / EOA     │
│                              │   │                        │
│  ┌────────────────────────┐  │   │   Signs SIWE message   │
│  │   App Router Pages     │  │   │   Signs sync/claim tx  │
│  │   (RSC + Client)       │  │   └───────────┬────────────┘
│  └────────────────────────┘  │               │
│  ┌────────────────────────┐  │               │
│  │   API Route Handlers   │  │               │
│  │   - auth (SIWE)        │  │               │
│  │   - teams              │  │               │
│  │   - scoring (admin)    │  │               │
│  │   - sync (signs vchr)  │  │               │
│  │   - claim (signs vchr) │  │               │
│  │   - leaderboard        │  │               │
│  └──────────┬─────────────┘  │               │
└─────────────┼────────────────┘               │
              │                                │
              ▼                                ▼
   ┌────────────────────┐          ┌──────────────────────────┐
   │   Neon Postgres    │          │   WireFluid Testnet      │
   │   (Drizzle ORM)    │          │   (chainId 92533)        │
   │                    │          │                          │
   │  - users           │          │  ┌────────────────────┐  │
   │  - players         │          │  │  PSLPoints.sol     │  │
   │  - teams           │          │  │  (ERC-20 trans-    │  │
   │  - matches         │          │  │   ferable + earned │  │
   │  - player_scores   │          │  │   balance track)   │  │
   │  - user_points     │          │  └──────────┬─────────┘  │
   │  - synced_records  │          │             │            │
   │  - claims          │          │             ▼            │
   │  - prizes          │          │  ┌────────────────────┐  │
   └────────────────────┘          │  │  PSLTrophies.sol   │  │
                                   │  │  (Soulbound ERC-   │  │
                                   │  │   721 achievement) │  │
                                   │  └────────────────────┘  │
                                   └──────────┬───────────────┘
                                              │
                                              │ RPC read (viem multicall)
                                              │
                                              ▼
                              Prize leaderboard cache (Postgres)
```

---

## Component Responsibilities

### Next.js App (Vercel, Fluid Compute)

**Single deployable unit** containing both the frontend and backend. Route handlers under `app/api/*` serve as the backend.

- **Pages**: landing, team picker, dashboard, leaderboards, prizes, trophies, admin
- **Server components**: fetch off-chain data from Postgres at request time
- **Client components**: wallet state, transaction flows, live leaderboard updates
- **API handlers**: auth, business logic, EIP-712 voucher signing, admin-only operations

### Neon Postgres (via Drizzle)

Single source of truth for **off-chain state**:

- User accounts (by wallet address)
- Player catalog (PSL 2026 squads)
- Team compositions
- Match results and per-player scores
- Accumulated user points
- Sync history
- Claim history
- Prize inventory

Never stores private keys, passwords, or anything sensitive.

### WireFluid Testnet Contracts

Source of truth for **prize eligibility and ownership**:

- `PSLPoints` — the BNDY token, transferable, with monotonic `earnedBalance` mapping
- `PSLTrophies` — soulbound achievement NFTs

Both deployed to WireFluid testnet. See [`CONTRACTS.md`](./CONTRACTS.md).

### Signer Wallet (Backend EOA)

A dedicated wallet owned by the backend. Private key stored in a Vercel environment variable. Used to:

- Sign EIP-712 **sync vouchers** (authorizing `PSLPoints.sync()` calls)
- Sign EIP-712 **claim vouchers** (authorizing `PSLPoints.claimTier()` calls)

**Never** holds user funds. Only signs authorization messages.

---

## Core Data Flows

### Flow 1 — User Registration

1. User clicks **Connect Wallet** on frontend
2. Frontend requests nonce from `/api/auth/nonce`
3. User signs SIWE message in wallet
4. Frontend POSTs `{ message, signature }` to `/api/auth/verify`
5. Backend verifies signature, creates `users` row if new, issues session JWT
6. Subsequent API calls include JWT → scoped to user's wallet address

### Flow 2 — Team Creation

1. Authenticated user GETs `/api/players` → list of PSL players
2. User selects 11 players in the UI
3. POST `/api/teams` with `{ playerIds: number[11] }`
4. Backend validates: user has no existing team, 11 players, no duplicates, all players active
5. Writes to `teams` + `team_players` tables

### Flow 3 — Match Scoring (Admin)

1. Admin authenticates via separate admin key
2. POST `/api/admin/matches/:id/scores` with per-player stats
3. Backend computes `points = runs + wickets*25 + catches*10` for each player
4. For every team that contains any of the scored players, update `user_points.total_points += delta`
5. Global leaderboard (DB view) updates immediately

### Flow 4 — Sync (Off-chain → On-chain)

1. User clicks **Sync** in dashboard
2. Frontend POST `/api/sync`
3. Backend calculates `delta = total_earned - already_synced`
4. Backend generates unique nonce, signs EIP-712 voucher:
   ```
   domain: { name: "PSLPoints", version: "1", chainId: 92533, verifyingContract }
   types:  SyncVoucher { user, amount, nonce }
   ```
5. Returns `{ amount, nonce, signature }` to frontend
6. Frontend calls `PSLPoints.sync(amount, nonce, signature)` via wagmi
7. User signs & submits tx → pays gas → contract mints tokens, increments `earnedBalance`
8. Backend observes `Synced` event (or polls) → writes `synced_records` row
9. Prize leaderboard cache refreshes

### Flow 5 — Claim

1. User sees their prize rank hits a tier band with stock available
2. User clicks **Claim Top N Prize**
3. Frontend POST `/api/claim` with `{ tierId }`
4. Backend checks:
   - User hasn't already claimed this tournament
   - On-chain `earnedBalance(user) >= 10,000 BNDY`
   - User's current prize rank is within tier band
   - Tier has stock remaining
5. Backend reserves the claim slot (DB row, `status: pending`)
6. Backend signs claim voucher
7. Frontend calls `PSLPoints.claimTier(tierId, nonce, signature)`
8. Contract verifies signature, checks minimum, burns balance, cross-calls `PSLTrophies.mintTrophy()`
9. User receives soulbound trophy NFT in wallet
10. Backend observes `TierClaimed` event → marks claim `status: confirmed`, triggers real-world fulfillment workflow
11. If tx fails / expires → backend releases slot, user can retry

---

## Leaderboards

### Global Leaderboard (off-chain)

- Reads from `user_points` table, ordered by `total_points DESC`
- Includes every player, qualified or not, synced or not
- Updates instantly after each match scoring event
- Purpose: engagement, social ranking
- Endpoint: `GET /api/leaderboard/global`

### Prize Leaderboard (on-chain, qualification-gated)

- **Rank metric**: `PSLPoints.balanceOf(wallet)` — transferable wallet balance
- **Qualification filter**: `PSLPoints.earnedBalance(wallet) >= 10,000 BNDY` — the same threshold enforced on-chain by `claimTier()`, mirrored in the backend leaderboard filter so visibility and claim eligibility are the same set
- Unqualified wallets never appear in the response even if their `balanceOf` is huge (pure-whale block)
- **Authoritative for prize eligibility** — ranks computed here drive the `/api/claim` tier-band check
- Cached in Postgres (`prize_leaderboard_snapshot`), refreshed lazily
- Endpoint: `GET /api/leaderboard/prize`

See [`GAME_DESIGN.md`](./GAME_DESIGN.md) for the strategic implications and [`TOKENOMICS.md`](./TOKENOMICS.md) for the invariant rationale.

---

## Indexing Strategy (no daemon, single Vercel deploy)

The prize leaderboard depends on `balanceOf`, which can change on any `Transfer` event — not just our voucher-issued `Synced`/`TierClaimed` events. That means the leaderboard must react to on-chain state we didn't personally authorize. However, we **do not** run a long-running indexer daemon. Everything is request-scoped inside Vercel Functions.

### Why no daemon

- Vercel Hobby cron jobs are limited to **once per day** (not useful for a 30s-refresh leaderboard)
- Running a separate indexer service on Railway/Fly doubles deployment surface, secret management, and cost
- Vercel Fluid Compute functions give us **up to 300s per request** on Hobby, which is plenty for a multicall + log-scan sweep
- Nobody needs realtime leaderboard updates when nobody is looking at the leaderboard

### Three-layer strategy

#### Layer 1 — Voucher-aware tracking (write path)

Every time the backend issues a `SyncVoucher` or `ClaimVoucher`, it:

1. Inserts a `synced_record` / `claim` row
2. Upserts the user wallet into `tracked_wallet`

This covers 100% of activity we authorize. The only wallets we need to discover _separately_ are recipients of BNDY via transfer who never interacted with our API.

#### Layer 2 — Lazy refresh on read (primary path)

`GET /api/leaderboard/prize` handler:

```ts
1. SELECT * FROM prize_leaderboard_snapshot WHERE tournament_id = $1
2. IF MAX(refreshed_at) > now() - 30s → return as-is (cache hit)
3. ELSE:
   a. Scan new Transfer logs since last cursor:
      eth_getLogs({ address: PSLPoints, topics: [Transfer], fromBlock: indexer_cursor.last_scanned_block })
   b. For each unique address in new logs, upsert into tracked_wallet
   c. Update indexer_cursor.last_scanned_block = currentBlock
   d. Load all tracked_wallet rows
   e. viem multicall: balanceOf(w) + earnedBalance(w) for every tracked wallet
   f. Filter to wallets where earnedBalance >= 10_000e18 (MIN_EARNED_TO_CLAIM — same gate as on-chain claim)
   g. Sort DESC by balanceOf, assign ranks
   h. Upsert all rows into prize_leaderboard_snapshot (atomic)
   i. Return fresh snapshot
```

This is the whole "indexer." One function handler, triggered only when someone reads the leaderboard. Completes in well under 1s for <1k wallets.

#### Layer 3 — Client polling (UI freshness)

The `/leaderboard` page polls `GET /api/leaderboard/prize` every 5s via a React hook. This:

- Keeps open leaderboard pages fresh without user interaction
- Combined with the 30s server cache, each poll either gets a cache hit (cheap) or triggers a refresh (bounded to ~1 per 30s per server instance)

### What this covers

| Event                                                              | Detected by                                                                              | Lag            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------- |
| User calls `sync()`                                                | Layer 1 (voucher record) → Layer 2 refresh on next read                                  | ≤30s           |
| User calls `claimTier()`                                           | Layer 1 (claim record) → Layer 2 refresh on next read                                    | ≤30s           |
| User calls `transfer()` to another user                            | Layer 2 log scan finds the new recipient                                                 | ≤30s           |
| Attacker bypasses our UI and calls `sync()` directly via Etherscan | Layer 2 log scan discovers the wallet via Transfer events (mint emits Transfer from 0x0) | ≤30s           |
| Attacker transfers dust to 10k wallets                             | Layer 2 picks them up but qualification filter keeps them off the leaderboard            | N/A (filtered) |

### What it does NOT cover

- **Sub-5s realtime rank movement on an already-open page** — poll interval is 5s and server cache is 30s, so worst case is ~35s lag between an on-chain event and a client seeing it. For hackathon demo purposes this is fine. If we ever need realtime, the upgrade path is WebSocket push + event listener daemon on Railway/Fly (v2).

### Additional DB tables this requires

- **`tracked_wallet`** — list of wallets seen through any path (voucher, transfer event, mint)
- **`indexer_cursor`** — `(contract_address, last_scanned_block)` to checkpoint the Transfer log scan
- **`prize_leaderboard_snapshot`** — extended with a `wallet_balance` column alongside `earned_balance`

See [`DATA_MODEL.md`](./DATA_MODEL.md) for schema.

### v1 implementation status (2026-04-14)

The shipped `GET /api/leaderboard/prize` handler implements a simplified subset of Layer 2:

1. `SELECT DISTINCT wallet FROM synced_record WHERE tournament_id = $1` is used as the tracked-wallet source in place of a dedicated `tracked_wallet` table. This covers every wallet that has ever been issued a sync voucher — the same set Layer 1 would populate.
2. viem `multicall` reads `balanceOf(w)` + `earnedBalance(w)` for each wallet.
3. The qualified set is filtered by `earnedBalance >= MIN_EARNED_TO_CLAIM_WEI` and sorted `balanceOf DESC` in-memory, ranks assigned, response returned.
4. **Not yet implemented:** Transfer log scanning, `indexer_cursor` advancement, `prize_leaderboard_snapshot` upsert, 30s stale-cache check, the `wallet_balance` column on the snapshot table, and the `tracked_wallet` table itself.

Gap vs spec: attackers who call `PSLPoints.sync()` directly without going through our API are not discovered, because the Transfer log scan is absent. For hackathon scope this is acceptable — the demo path always goes through the voucher flow, so every participant lands in `synced_record` naturally. The full Layer 2 is a v1.5 upgrade (see BUILD_CHECKLIST §9).

---

## Trust Model

| Actor           | Trusted for                                              | NOT trusted for                                |
| --------------- | -------------------------------------------------------- | ---------------------------------------------- |
| Backend         | Off-chain scoring, voucher signing, leaderboard ordering | Custodying user funds; can't spend user tokens |
| Signer key      | Authorizing sync/claim deltas                            | Controlling user wallets                       |
| User wallet     | Owning tokens, signing txs                               | Determining their own point total              |
| Admin           | Submitting match results                                 | Claiming prizes or minting to self arbitrarily |
| WireFluid chain | Finalizing txs, storing `earnedBalance` truth            | Calculating points                             |

**Single point of trust**: the backend signer. If compromised, attacker could mint arbitrary BNDY to any wallet. Mitigations in [`SECURITY.md`](./SECURITY.md).

**v2 plan**: replace off-chain scoring with Merkle-root commitments published on-chain after each match, so users can cryptographically verify their own inclusion.

---

## Failure Modes

| Failure                            | Impact                                         | Recovery                                                   |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| User tx fails after voucher issued | Reserved claim slot held                       | 5-min expiry on voucher, backend releases slot             |
| Backend signer key rotation        | In-flight vouchers invalid                     | Document new signer addr in contract via admin setter (v2) |
| Postgres down                      | App unavailable                                | Neon auto-failover; on-chain state unaffected              |
| WireFluid RPC down                 | Sync/claim/leaderboard refresh fail            | Retry with backoff; game continues off-chain               |
| Chain reorg                        | Voucher nonce collision theoretically possible | 5s finality on WireFluid makes this vanishingly unlikely   |
| Replay attack on voucher           | Duplicate mint/claim                           | `usedNonces` mapping in contract                           |

---

## Scaling Notes (out of hackathon scope)

- Prize leaderboard cache: fine for <10k players via lazy-refresh multicall; beyond that the Layer 2 refresh exceeds request-budget latency and needs a proper indexer (Ponder / Goldsky) with real-time writes to the snapshot table
- Transfer log scanning: `eth_getLogs` over a widening block range is cheap for hackathon scale but unbounded long-term — v2 should batch scans by block window and store them
- Match scoring: currently O(users × players); batch by player to O(players) + index lookups
- Voucher signing: stateless, horizontally scalable
- Postgres: indexed on `wallet`, `total_points DESC`, `tier`, `nonce`, `tracked_wallet.wallet`
- Realtime leaderboard: upgrade path is a Railway/Fly event-listener daemon writing directly to the snapshot table + WebSocket push to clients. Out of v1 scope.
