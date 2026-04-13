# API Reference

> REST endpoints exposed by the Next.js app under `/api/*`. All endpoints return JSON.

---

## Conventions

- **Base URL** (local): `http://localhost:3000/api`
- **Base URL** (prod): `https://boundaryline.vercel.app/api`
- **Auth**: SIWE-derived session JWT in `Authorization: Bearer <token>` header
- **Errors**: `{ error: string, code: string }` with appropriate HTTP status
- **Timestamps**: ISO 8601 strings in UTC
- **Addresses**: lowercase `0x...` hex strings

---

## Authentication

### `GET /api/auth/nonce`
Returns a fresh nonce the user must include in their SIWE message.

**Response** `200`
```json
{ "nonce": "a1b2c3d4e5f6" }
```

### `POST /api/auth/verify`
Verifies a SIWE signature and issues a session JWT.

**Request**
```json
{
  "message": "<full SIWE message string>",
  "signature": "0x..."
}
```

**Response** `200`
```json
{
  "token": "eyJhbGc...",
  "user": {
    "wallet": "0xabcd...",
    "createdAt": "2026-04-13T09:30:00Z"
  }
}
```

**Errors**
- `401` `{ error: "Invalid signature", code: "SIWE_INVALID" }`
- `400` `{ error: "Nonce mismatch", code: "NONCE_MISMATCH" }`

### `POST /api/auth/logout`
Invalidates the current session JWT (server-side blacklist).

**Response** `204`

---

## Players

### `GET /api/players`
Returns the full PSL 2026 player catalog.

**Response** `200`
```json
{
  "players": [
    {
      "id": 1,
      "name": "Babar Azam",
      "team": "Karachi Kings",
      "role": "batsman",
      "basePrice": 14,
      "photoUrl": "/players/babar-azam.jpg"
    },
    ...
  ]
}
```

**Cache**: 1 hour (static data for tournament duration).

---

## Teams

### `POST /api/teams`
Create the authenticated user's team. One team per user per tournament.

**Auth**: required

**Request**
```json
{
  "playerIds": [1, 5, 9, 12, 18, 23, 31, 38, 41, 44, 52]
}
```

**Response** `201`
```json
{
  "team": {
    "id": 42,
    "wallet": "0xabcd...",
    "playerIds": [1, 5, 9, ...],
    "totalCredits": 98,
    "createdAt": "2026-04-13T10:15:00Z"
  }
}
```

**Errors**
- `400` `{ error: "Must select exactly 11 players", code: "INVALID_TEAM_SIZE" }`
- `400` `{ error: "Salary cap exceeded (103/100)", code: "CAP_EXCEEDED" }`
- `400` `{ error: "Duplicate player", code: "DUPLICATE_PLAYER" }`
- `409` `{ error: "Team already exists", code: "TEAM_EXISTS" }`

### `GET /api/teams/me`
Get the authenticated user's team.

**Auth**: required

**Response** `200`
```json
{
  "team": {
    "id": 42,
    "wallet": "0xabcd...",
    "players": [
      { "id": 1, "name": "Babar Azam", "role": "batsman", "basePrice": 14 },
      ...
    ],
    "totalCredits": 98,
    "createdAt": "2026-04-13T10:15:00Z"
  }
}
```

**Errors**
- `404` `{ error: "No team found", code: "NO_TEAM" }`

---

## Points & Sync

### `GET /api/points/me`
Returns the caller's four key numbers: total earned (off-chain), on-chain synced, wallet balance, unsynced delta.

**Auth**: required

**Response** `200`
```json
{
  "wallet": "0xabcd...",
  "totalEarned": 24830,
  "onChainEarned": 10000,
  "walletBalance": 10000,
  "unsynced": 14830,
  "globalRank": 47,
  "globalTotal": 2843,
  "prizeRank": 8,
  "prizeTotal": 89,
  "currentTierBand": "TOP_10",
  "canClaim": true
}
```

### `POST /api/sync`
Requests a signed mint voucher for the user's currently unsynced points.

**Auth**: required

**Response** `200`
```json
{
  "voucher": {
    "user": "0xabcd...",
    "amount": "14830000000000000000000",
    "nonce": "4293847234"
  },
  "signature": "0x...",
  "expiresAt": "2026-04-13T14:20:00Z",
  "estimatedGas": "70000"
}
```

The frontend then submits `PSLPoints.sync(amount, nonce, signature)` via wagmi. No follow-up API call is needed; the backend picks up the on-chain `Synced` event and updates caches.

**Errors**
- `400` `{ error: "No points to sync", code: "NOTHING_TO_SYNC" }`
- `403` `{ error: "Not authenticated", code: "UNAUTHORIZED" }`

---

## Claims

### `POST /api/claim`
Requests a signed claim voucher for a specific tier. Server validates eligibility and reserves a tier stock slot before returning.

**Auth**: required

**Request**
```json
{
  "tierId": 3
}
```

Tier IDs: `1 = TOP_50`, `2 = TOP_25`, `3 = TOP_10`, `4 = TOP_3`, `5 = RANK_1`.

**Response** `200`
```json
{
  "voucher": {
    "user": "0xabcd...",
    "tierId": 3,
    "nonce": "9218734"
  },
  "signature": "0x...",
  "expiresAt": "2026-04-13T14:25:00Z",
  "prize": {
    "name": "Signed Cricket Bat",
    "description": "Autographed PSL 2026 match bat",
    "imageUrl": "/prizes/signed-bat.png"
  }
}
```

**Errors**
- `400` `{ error: "Below 10,000 BNDY earned minimum", code: "BELOW_THRESHOLD" }`
- `400` `{ error: "Not in this tier band", code: "WRONG_TIER" }`
- `409` `{ error: "Tier out of stock", code: "NO_STOCK" }`
- `409` `{ error: "Already claimed this tournament", code: "ALREADY_CLAIMED" }`

### `GET /api/claim/status`
Returns the caller's claim history in the current tournament.

**Auth**: required

**Response** `200`
```json
{
  "claim": null
}
```
or once claimed:
```json
{
  "claim": {
    "tierId": 3,
    "tierName": "Top 10",
    "txHash": "0x...",
    "tokenId": 18,
    "claimedAt": "2026-04-13T13:45:00Z",
    "fulfillmentStatus": "pending_shipping"
  }
}
```

---

## Leaderboards

### `GET /api/leaderboard/global`
Off-chain global leaderboard. Ranks all registered users by total earned points. Supports pagination.

**Query params**
- `limit` — default `100`, max `500`
- `offset` — default `0`
- `around` — optional wallet address; returns `±25` around that user's rank

**Response** `200`
```json
{
  "entries": [
    { "rank": 1, "wallet": "0x...", "totalPoints": 52100, "displayName": null },
    ...
  ],
  "totalPlayers": 2843,
  "updatedAt": "2026-04-13T13:40:00Z"
}
```

### `GET /api/leaderboard/prize`
On-chain prize leaderboard. **Ranked by `balanceOf` (wallet balance), filtered to wallets with `earnedBalance >= 10,000 BNDY`** — the same threshold the on-chain `claimTier()` enforces for prize claims. Reads from cached snapshot (`prize_leaderboard_snapshot`) with lazy refresh on >30s staleness.

Unqualified wallets (those below the 10,000 BNDY earned threshold) do NOT appear in this response regardless of their wallet balance. This is the core pure-whale mitigation.

**Query params**
- `limit` — default `100`, max `500`
- `offset` — default `0`

**Response** `200`
```json
{
  "entries": [
    {
      "rank": 1,
      "wallet": "0x...",
      "walletBalance": "52100000000000000000000",
      "earnedBalance": "12400000000000000000000",
      "tierEligible": "RANK_1",
      "canClaim": true
    },
    ...
  ],
  "totalQualified": 89,
  "snapshotBlock": 1829473,
  "updatedAt": "2026-04-13T13:40:00Z"
}
```

**Field semantics**
- `rank` — position among qualified wallets, ordered by `walletBalance DESC`
- `walletBalance` — `PSLPoints.balanceOf(wallet)` as uint256 string, the rank metric
- `earnedBalance` — `PSLPoints.earnedBalance(wallet)` as uint256 string, the qualification + claim metric
- `tierEligible` — the tier band this rank falls into (`RANK_1` / `TOP_3` / `TOP_10` / `TOP_25` / `TOP_50`)
- `canClaim` — `true` if the wallet has tier stock available and no prior active claim. Qualification (`earnedBalance >= 10,000 BNDY`) is implicit: any wallet on this response has already passed the filter.
- `totalQualified` — count of wallets that passed the 10,000 BNDY earned filter

---

## Prizes

### `GET /api/prizes`
Returns the tier catalog with current stock levels.

**Response** `200`
```json
{
  "tiers": [
    {
      "tierId": 1,
      "name": "Top 50",
      "rankRequired": 50,
      "stock": 50,
      "claimed": 7,
      "prize": {
        "name": "Team Merch Bundle",
        "description": "...",
        "imageUrl": "/prizes/merch.png"
      }
    },
    ...
  ]
}
```

---

## Trophies

### `GET /api/trophies/:wallet`
Returns the trophy NFTs held by a given wallet. Reads from the `PSLTrophies` contract.

**Response** `200`
```json
{
  "wallet": "0xabcd...",
  "trophies": [
    {
      "tokenId": 18,
      "tierId": 3,
      "tierName": "Top 10",
      "tournamentId": 1,
      "mintedAt": "2026-04-13T13:45:00Z",
      "tokenUri": "data:application/json;base64,..."
    }
  ]
}
```

---

## Admin

All admin endpoints require a separate `X-Admin-Key` header matching the `ADMIN_API_KEY` env var.

### `POST /api/admin/matches`
Create a match record.

**Request**
```json
{
  "teamA": "Karachi Kings",
  "teamB": "Lahore Qalandars",
  "scheduledAt": "2026-04-14T15:00:00Z"
}
```

### `POST /api/admin/matches/:id/scores`
Submit final scores for a match. This triggers point calculation for all teams.

**Request**
```json
{
  "playerStats": [
    { "playerId": 1, "runs": 87, "wickets": 0, "catches": 1, "dismissedForZero": false },
    { "playerId": 9, "runs": 12, "wickets": 3, "catches": 0, "dismissedForZero": false },
    ...
  ]
}
```

**Response** `200`
```json
{
  "matchId": 5,
  "usersAffected": 412,
  "totalPointsAwarded": 1289400
}
```

### `POST /api/admin/tournaments/:id/close`
Marks a tournament as closed. No more scoring accepted. Claims remain open for grace period.

---

## Rate Limits (v2)

Current implementation has no rate limiting beyond Vercel's defaults. For v2:
- `/api/auth/nonce`: 10/min per IP
- `/api/sync`: 1/min per wallet
- `/api/claim`: 1/min per wallet
- `/api/admin/*`: unlimited with valid key

---

## Webhooks (v2)

Planned: webhook delivery to an external fulfillment system when `TierClaimed` event fires. Out of hackathon scope.
