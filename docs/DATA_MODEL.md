# Data Model

> Postgres schema (Drizzle ORM) for BoundaryLine off-chain state.

---

## Conventions

- Snake_case for column names
- Singular table names (Drizzle convention)
- Wallet addresses stored lowercase, `text` column, CHECK constraint validates `0x[0-9a-f]{40}`
- Timestamps: `timestamptz`, defaulting to `now()`
- Point values stored as `bigint` (avoid float precision issues)
- Token amounts stored as `numeric(78, 0)` to match uint256 range

---

## Entity Relationship Diagram

```
┌─────────────┐        ┌────────────┐         ┌─────────────┐
│    user     │◄───┐   │   player   │    ┌───►│    team     │
└─────────────┘    │   └────────────┘    │    └──────┬──────┘
                   │           ▲         │           │
                   │           │         │           ▼
                   │    ┌──────┴──────┐  │   ┌──────────────┐
                   │    │player_score │  │   │ team_player  │
                   │    └──────┬──────┘  │   └──────────────┘
                   │           │         │
                   │           ▼         │
                   │    ┌────────────┐   │
                   │    │   match    │◄──┘
                   │    └────────────┘
                   │
                   ├──────────────────┐
                   │                  │
                   ▼                  ▼
           ┌───────────────┐  ┌─────────────────┐
           │  user_point   │  │  synced_record  │
           └───────────────┘  └─────────────────┘
                   │
                   ▼
           ┌───────────────┐
           │    claim      │
           └───────────────┘
```

---

## Tables

### `user`

```ts
user {
  wallet        text          primary key          // lowercase 0x...
  display_name  text          nullable             // optional alias
  created_at    timestamptz   default now()
  updated_at    timestamptz   default now()
}
```

**Indexes**

- `PK (wallet)`

**Notes**

- `wallet` is the canonical identity key
- No email, no password, no off-chain credentials
- SIWE nonces are **not** stored on this row — they live in their own
  `siwe_nonce` table so that multiple concurrent `/api/auth/nonce` calls
  (multi-tab) don't clobber each other. See `siwe_nonce` below.

---

### `siwe_nonce`

Server-side nonce store for the SIWE login flow. One row per issued nonce.
Single-use: a row is created on `GET /api/auth/nonce` and marked consumed
on successful `POST /api/auth/verify`. A stale row is free to leave until
the lazy sweep reaps it.

```ts
siwe_nonce {
  nonce         text          primary key          // random 64-bit hex
  issued_at     timestamptz   default now()
  expires_at    timestamptz   not null             // issued_at + 10 minutes
  consumed_at   timestamptz   nullable             // set on /verify success
}
```

**Indexes**

- `PK (nonce)`
- `INDEX (expires_at)` — for the lazy sweep of expired rows

**Notes**

- The nonce is not tied to a wallet at issue time. The wallet is only known
  at `/verify` time, when the signature is recovered. Binding at issue
  would require the client to send its address on `/nonce`, which opens a
  DoS griefing vector (any attacker could rotate a victim's nonce). Here,
  every tab gets its own row keyed by the random nonce itself.
- Consumption is atomic:
  ```sql
  UPDATE siwe_nonce
     SET consumed_at = now()
   WHERE nonce = $1 AND consumed_at IS NULL AND expires_at > now()
  RETURNING nonce
  ```
  If zero rows return, the nonce was missing, already used, or expired —
  reject with `NONCE_MISMATCH`.
- Expired rows are swept lazily (opportunistic `DELETE` on `/nonce` calls)
  rather than via cron. Hobby-plan-friendly.

---

### `player`

```ts
player {
  id           serial        primary key
  external_id  text          unique                // from seed data
  name         text          not null
  team         text          not null              // PSL franchise
  role         text          not null              // 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper'
  photo_url    text          nullable
  active       boolean       default true
  created_at   timestamptz   default now()
}
```

**Indexes**

- `PK (id)`
- `UNIQUE (external_id)`
- `INDEX (team)`
- `INDEX (role)`

---

### `match`

```ts
match {
  id            serial        primary key
  tournament_id integer       not null
  team_a        text          not null
  team_b        text          not null
  venue         text          nullable              // optional stadium / ground label for dashboard activity
  scheduled_at  timestamptz   not null
  status        text          not null              // 'scheduled' | 'live' | 'completed'
  played_at     timestamptz   nullable
  created_at    timestamptz   default now()
}
```

**Indexes**

- `PK (id)`
- `INDEX (tournament_id, status)`

---

### `player_score`

Per-match, per-player stat line. One row per (match, player).

```ts
player_score {
  id                  serial       primary key
  match_id            integer      references match(id) not null
  player_id           integer      references player(id) not null
  runs                integer      default 0
  wickets             integer      default 0
  catches             integer      default 0
  run_outs            integer      default 0
  stumpings           integer      default 0
  dismissed_for_zero  boolean      default false
  points_awarded      bigint       not null             // calculated via formula
  created_at          timestamptz  default now()
}
```

**Indexes**

- `PK (id)`
- `UNIQUE (match_id, player_id)`
- `INDEX (player_id)`

---

### `team`

One team per user per tournament.

```ts
team {
  id             serial       primary key
  user_wallet    text         references user(wallet) not null
  tournament_id  integer      not null
  created_at     timestamptz  default now()
}
```

**Indexes**

- `PK (id)`
- `UNIQUE (user_wallet, tournament_id)`

---

### `team_player`

Junction — 11 rows per team.

```ts
team_player {
  team_id    integer    references team(id) not null
  player_id  integer    references player(id) not null

  PRIMARY KEY (team_id, player_id)
}
```

**Indexes**

- `PK (team_id, player_id)`
- `INDEX (player_id)` — for reverse lookup during match scoring

---

### `user_point`

Denormalized running total per user per tournament. Updated transactionally when a match is scored.

```ts
user_point {
  wallet          text          not null
  tournament_id   integer       not null
  total_points    bigint        default 0 not null
  last_match_id   integer       nullable
  updated_at      timestamptz   default now()

  PRIMARY KEY (wallet, tournament_id)
}
```

**Indexes**

- `PK (wallet, tournament_id)`
- `INDEX (tournament_id, total_points DESC)` — for global leaderboard queries

**Query for global leaderboard**

```sql
SELECT wallet, total_points,
       RANK() OVER (ORDER BY total_points DESC) as rank
FROM user_point
WHERE tournament_id = $1
ORDER BY total_points DESC
LIMIT $2 OFFSET $3;
```

---

### `synced_record`

Audit trail of every successful on-chain sync.

```ts
synced_record {
  id             serial        primary key
  wallet         text          not null
  tournament_id  integer       not null
  amount         numeric(78,0) not null                 // uint256 BNDY
  nonce          numeric(78,0) not null
  tx_hash        text          nullable
  block_number   bigint        nullable
  status         text          not null                 // 'pending' | 'confirmed' | 'failed'
  voucher_expires_at timestamptz not null
  created_at     timestamptz   default now()
  confirmed_at   timestamptz   nullable
}
```

**Indexes**

- `PK (id)`
- `UNIQUE (nonce)`
- `INDEX (wallet, tournament_id)`

**Purpose**

- `total_synced_for_user = SUM(amount) WHERE wallet = X AND status = 'confirmed'`
- `unsynced_delta = user_point.total_points - total_synced_for_user`

---

### `claim`

One row per claim attempt. Status transitions: `pending → confirmed` or `pending → expired`.

```ts
claim {
  id                  serial        primary key
  wallet              text          not null
  tournament_id       integer       not null
  tier_id             smallint      not null
  nonce               numeric(78,0) not null
  tx_hash             text          nullable
  block_number        bigint        nullable
  status              text          not null               // 'pending' | 'confirmed' | 'expired'
  voucher_expires_at  timestamptz   not null
  trophy_token_id     bigint        nullable
  fulfillment_status  text          default 'none'         // 'none' | 'pending_shipping' | 'shipped' | 'delivered'
  created_at          timestamptz   default now()
  confirmed_at        timestamptz   nullable
}
```

**Indexes**

- `PK (id)`
- `UNIQUE (nonce)`
- `UNIQUE (wallet, tournament_id) WHERE status IN ('pending', 'confirmed')` — enforces one active claim per user per tournament
- `INDEX (tier_id, status)` — for stock calculations

**Stock calculation**

```sql
SELECT tier_id, COUNT(*) as claimed
FROM claim
WHERE tournament_id = $1 AND status IN ('pending', 'confirmed')
GROUP BY tier_id;
```

Stock remaining = `tier.stock_limit - claimed`.

---

### `prize`

Static prize catalog, one row per tier per tournament.

```ts
prize {
  id            serial        primary key
  tournament_id integer       not null
  tier_id       smallint      not null
  name          text          not null
  description   text          not null
  image_url     text          nullable
  stock_limit   integer       not null
  rank_required integer       not null               // 1, 3, 10, 25, 50

  UNIQUE (tournament_id, tier_id)
}
```

---

### `prize_leaderboard_snapshot`

> **v1 status (2026-04-14):** the base table is migrated with `earned_balance`, `rank`, and `snapshot_block` columns, but the `wallet_balance` column and its supporting `(tournament_id, wallet_balance DESC)` index described below are **not yet applied**. The current `GET /api/leaderboard/prize` handler does the contract reads + sort in-memory on each request and does not persist to this table. On WireFluid this currently uses plain `readContract()` calls in small batches rather than viem `multicall`, because the chain is not configured with `multicall3`. The schema below is the target shape for v1.5; a migration will add the `wallet_balance` column and wire up snapshot upserts when the full lazy-refresh pipeline (Transfer log scan + `tracked_wallet` + `indexer_cursor`) ships.

Cache of the on-chain prize leaderboard. Refreshed lazily on read from `GET /api/leaderboard/prize` when older than 30s. Populated by a viem multicall of `balanceOf()` + `earnedBalance()` across all `tracked_wallet` entries.

```ts
prize_leaderboard_snapshot {
  wallet           text           not null
  tournament_id    integer        not null
  wallet_balance   numeric(78,0)  not null                 // balanceOf — the rank metric
  earned_balance   numeric(78,0)  not null                 // earnedBalance — the qualification filter
  rank             integer        not null                 // rank computed from wallet_balance among qualified wallets
  snapshot_block   bigint         not null
  refreshed_at     timestamptz    default now()

  PRIMARY KEY (wallet, tournament_id)
}
```

**Indexes**

- `PK (wallet, tournament_id)`
- `INDEX (tournament_id, rank)`
- `INDEX (tournament_id, wallet_balance DESC)` — supports rank recomputation

**Population rules**:

- Only wallets with `earned_balance >= 10_000_000000000000000000` (10,000 BNDY, 18 decimals — same as `MIN_EARNED_TO_CLAIM`) are inserted (qualification filter)
- Rank is `ROW_NUMBER() OVER (ORDER BY wallet_balance DESC)` among qualified wallets
- A wallet that previously qualified but has since dropped below the threshold (e.g. after a successful claim that reset its earnedBalance to 0) is deleted from this table on refresh

**Refresh strategy**:

- Lazy refresh: `GET /api/leaderboard/prize` checks `MAX(refreshed_at)` against `now() - interval '30 seconds'` and rebuilds the snapshot if stale
- No cron — Vercel Hobby crons are daily-only (see `docs/ARCHITECTURE.md` §Indexing Strategy)
- Client-side 5s polling on the leaderboard page gives the appearance of freshness

---

### `tracked_wallet`

> **v1 status (2026-04-14):** **not yet migrated.** In v1 the `GET /api/leaderboard/prize` handler substitutes `SELECT DISTINCT wallet FROM synced_record WHERE tournament_id = $1` as its wallet source — everyone who has ever been issued a sync voucher is implicitly tracked. The dedicated `tracked_wallet` table ships alongside the Transfer-log scan in v1.5, at which point wallets who received BNDY via transfer but never called `/api/sync` will also be discoverable.

List of wallet addresses the indexer should include in leaderboard reads. Populated from two sources: (1) voucher issuance in `/api/sync` and `/api/claim`, (2) Transfer log scanning during lazy refresh.

```ts
tracked_wallet {
  wallet         text          primary key              // lowercase 0x..., CHECK constraint
  first_seen_at  timestamptz   default now()
  first_seen_via text          not null                 // 'voucher' | 'transfer_log' | 'mint'
  last_touched   timestamptz   default now()
}
```

**Indexes**

- `PK (wallet)`

**Notes**

- Never contains wallet balances or earned amounts — those are read from chain at refresh time
- Contains _all_ wallets ever seen, qualified or not; the qualification filter is applied downstream at snapshot-build time
- A wallet that receives dust via transfer is tracked here but will not appear in `prize_leaderboard_snapshot` unless it earns 10,000 BNDY

---

### `indexer_cursor`

> **v1 status (2026-04-14):** **not yet migrated.** The v1 prize leaderboard handler does not run a Transfer log scan, so no cursor state is needed. This table ships with the v1.5 indexer work.

Checkpoint for Transfer log scanning. One row per contract.

```ts
indexer_cursor {
  contract_address    text      primary key              // lowercase 0x...
  last_scanned_block  bigint    not null default 0
  updated_at          timestamptz default now()
}
```

**Notes**

- Initialized at contract deploy block
- Updated atomically at the end of each lazy refresh after a successful scan
- Scan uses `eth_getLogs({ address, topics: [Transfer], fromBlock: last_scanned_block + 1, toBlock: 'latest' })`
- A race between concurrent refreshes is acceptable because `tracked_wallet` upserts are idempotent

---

### `tournament`

```ts
tournament {
  id           serial       primary key
  name         text         not null
  status       text         not null                // 'open' | 'active' | 'closed' | 'archived'
  started_at   timestamptz  nullable
  closed_at    timestamptz  nullable
  grace_ends   timestamptz  nullable
  created_at   timestamptz  default now()
}
```

For the hackathon demo, exactly one tournament row exists.

---

### `admin_session`

Simple admin auth for the scoring panel.

```ts
admin_session {
  token        text          primary key
  created_at   timestamptz   default now()
  expires_at   timestamptz   not null
}
```

Or just use an `ADMIN_API_KEY` env var and skip this table. Simpler for hackathon.

---

## Migrations

Drizzle Kit migrations in `packages/db/drizzle/`. Run via:

```bash
pnpm db:generate    # generate migration from schema.ts diff
pnpm db:push        # apply to Neon (dev)
pnpm db:migrate     # apply via migration files (prod)
pnpm db:seed        # load players + prizes + tournament row
```

---

## Seed Data

Loaded from `data/psl-2026-players.json` — roughly 150–200 player records spanning all six PSL franchises.

Prize seed data in `data/prizes.json` — 5 tiers × 1 tournament = 5 prize rows.
Match seed data in `data/matches.json` — 3 demo fixtures with venue labels for the dashboard activity feed.

Tournament seed: one `tournament` row with `status: 'active'`.

---

## What's NOT In The DB

- Private keys (backend signer key is in env)
- Raw SIWE messages after verification
- User passwords (wallet-based auth, no passwords)
- Transaction hashes for events we haven't observed yet (indexer writes them async)
- On-chain balances (always read from contract)
- Trophy NFTs (read from `PSLTrophies` contract)

**Golden rule**: the chain is the source of truth for `earnedBalance`, `balanceOf`, and trophy ownership. The DB caches these in `prize_leaderboard_snapshot` for query speed but never overrides them. On any snapshot read that hits fresh data, the response is reliable up to the `refreshed_at` timestamp; consumers that need strict currency should re-read directly from the contract via viem.
