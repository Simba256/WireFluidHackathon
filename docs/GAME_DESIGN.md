# Game Design

> Rules, scoring, tiers, and the strategic loops that make BoundaryLine fun.

---

## The Core Loop

```
        ┌──────────────┐
        │  Pick team   │◄──────────┐
        └──────┬───────┘           │
               │                   │
               ▼                   │
        ┌──────────────┐           │
        │ Watch match  │           │ (next tournament)
        │ Earn points  │           │
        └──────┬───────┘           │
               │                   │
               ▼                   │
        ┌──────────────┐           │
        │ Sync to chain│           │
        │ (optional)   │           │
        └──────┬───────┘           │
               │                   │
               ▼                   │
        ┌──────────────┐           │
        │  Climb prize │           │
        │  leaderboard │           │
        └──────┬───────┘           │
               │                   │
               ▼                   │
        ┌──────────────┐           │
        │  Claim tier  │───────────┘
        │  OR keep     │
        │  playing     │
        └──────────────┘
```

Each loop lasts one tournament. A tournament corresponds to a real PSL stage (e.g. group stage, playoffs, or full season). For the hackathon demo, we'll simulate a compressed "tournament" of 2–3 matches.

---

## Team Selection

### Rules (v1)
- Pick exactly **11 players**
- Players come from the PSL 2026 player catalog (seeded in DB)
- **Salary cap**: 100 credits total across your 11 picks
- **Role balance** (v1 relaxed): no position requirements, just pick 11
- **Role balance** (v1.1 if time permits): min 1 wicketkeeper, min 4 bowlers, min 3 batsmen, max 4 from any one franchise

### Player Pricing
Each player has a `base_price` in the seed data, roughly proportional to their expected performance:
- Star batsmen (Babar, Rizwan, Fakhar): 12–15 credits
- Frontline bowlers (Shaheen, Rauf, Naseem): 11–14 credits
- All-rounders: 9–12 credits
- Role players / bench: 5–8 credits

**Average pick cost** with a 100-credit cap: ~9 credits/player, forcing real tradeoffs. You can't fit all six stars.

### Team Lock
Once submitted, a team is **locked for the tournament**. No swaps, no substitutes. This avoids backend complexity and forces commitment. v2 could add a weekly substitution window.

---

## Point Formula (v1)

Simple, cricket-native, demo-readable:

```
playerMatchPoints = 
    (runs_scored × 1)
  + (wickets_taken × 25)
  + (catches × 10)
  + (run_outs × 10)
  + (stumpings × 10)
  + (half_century_bonus: 20 if runs >= 50)
  + (century_bonus: 50 if runs >= 100)
  + (five_wicket_bonus: 50 if wickets >= 5)
  − (duck_penalty: 5 if dismissed for 0)

teamMatchPoints = Σ playerMatchPoints for each of your 11 players
userTotalPoints = Σ teamMatchPoints across all matches played so far
```

### Point multipliers (v1 skip, v2 feature)
- Captain pick × 2 multiplier
- Vice-captain pick × 1.5 multiplier

Add only if Day 2 goes well. The base formula is enough for a compelling demo.

---

## Tiers & Prizes

Five prize tiers, each gated by **on-chain prize rank**:

| Tier | Rank Required | Stock | Prize (mock, representative) |
|---|---|---|---|
| Rank 1 | `= 1` | 1 | Grand prize package (jersey + signed bat + VIP final tickets) |
| Top 3 | `≤ 3` | 3 | VIP final ticket + meet & greet |
| Top 10 | `≤ 10` | 10 | Signed cricket bat |
| Top 25 | `≤ 25` | 25 | Signed poster + team jersey |
| Top 50 | `≤ 50` | 50 | Team merch bundle |

### Claim Rules

1. **One claim per user per tournament.** Once you claim, you're out of the prize race. You can keep playing for fun, but you cannot claim a second prize.

2. **Claim only your current tier band.** If you are ranked #7 on the prize leaderboard, you can claim Top 10. You cannot "downgrade" to claim Top 25 or Top 50 instead. This forces strategic commitment at your actual rank.

3. **Minimum earned required.** You must have `earnedBalance >= 10,000 BNDY` on-chain regardless of rank or wallet balance. A player ranked #3 with 50,000 BNDY wallet balance but only 5,000 earned cannot claim — they must keep playing until they personally earn another 5,000 through real match performance. Purchased or received tokens contribute to rank but not to the claim gate.

4. **First come, first served within tier.** Stock is finite. If the 10 Top-10 slots fill up, players currently in rank 11+ must either stay in a lower tier or keep climbing hoping someone above them claims/drops.

5. **Claiming is irreversible.** No refunds, no undo. The burn happens atomically with the trophy mint.

---

## Strategic Layers

BoundaryLine is deliberately designed with multiple overlapping decisions. None are required to enjoy the game, but each rewards players who think ahead.

### Layer 1 — Team picking
Standard fantasy sports. Weigh star picks vs depth. Read the matchups. Classic.

### Layer 2 — When to claim
The **press-your-luck mechanic**. At any moment, you can:
- **Cash out now** — guaranteed prize at your current tier
- **Keep playing** — risk your rank dropping as others climb, but potentially reach a better tier

Example: You're rank #15 with 30,000 BNDY. Top 25 is claimable. You could lock in the jersey + poster. Or you could try to reach Top 10 for the signed bat — but someone above you might claim a slot first, pushing you up, or a newcomer could surge past you on tomorrow's match.

### Layer 3 — When to sync
**Qualifying and unlocking rank movement.** Earned points live off-chain until you pay gas to sync them on-chain. Two things happen when you sync:

1. Tokens are minted into your wallet → `balanceOf` goes up → your leaderboard rank changes
2. `earnedBalance` increments → you get closer to the 1k visibility floor and the 10k claim gate

- **Sync early (cross the 1k floor fast)** — get on the leaderboard immediately, unlock secondary-market participation, reveal that you're competing
- **Sync to exactly 10k** — minimum viable claim qualification; below this the contract reverts any claim attempt
- **Sync partial, top up via trade** — sync enough to clear 1k, then buy additional BNDY on a DEX to climb rank without waiting for the next match. Only valid as a rank strategy; you still need 10k *earned* to actually convert rank into a prize.
- **Sync all** — maximum rank from your earned pool, zero reliance on the market

### Layer 4 — Trading, gifting, and market play (**core strategic axis**)
BNDY is transferable, and `balanceOf` is the leaderboard rank metric. Trading is not a side channel — it's a primary way to move on the board. A qualified player (≥1k earned) has real, meaningful choices here:

- **Buy to climb** — a player ranked #15 with 8,000 BNDY could buy 5,000 more BNDY off-market and jump to #9, without waiting for another match. Their claim eligibility doesn't improve (earned is still 8k), but their rank does. If they can push earned to 10k before the tournament ends, the rank is convertible.
- **Sell to exit** — a player who has decided they're not going to play further can sell residual BNDY to players still competing. The token has real intra-tournament demand because rank matters.
- **Gift to ally** — transfer BNDY to a friend below the 1k floor to bootstrap them onto the leaderboard (they still need to play ≥1k of their own earned to qualify — the gift can't bypass the floor), or to push them into a better rank band once qualified.
- **Consolidate wallets** — combine balances from multiple wallets you control to concentrate rank. Note: `earnedBalance` does NOT consolidate. You can concentrate `balanceOf`, not `earnedBalance`.
- **DEX trade** — any DEX that lists BNDY becomes a legitimate in-game mechanic. Expect mid-tournament price discovery driven by rank demand.

**The critical invariant**: none of these moves bypass the 10k earned claim gate. You can manipulate rank with capital all day long; you cannot manipulate prizes with capital. The claim gate is contract-enforced.

**Emergent gameplay**: a whale with no play history cannot rank. A grinder with 1k earned and no capital cannot climb past whoever outspends them. The meta is a balance between earning (which unlocks qualification + claim) and acquiring (which unlocks rank). Most successful players will do both.

### Layer 5 — Game theory around stock depletion
Tier stock is finite. As Top 10 slots fill up, the pressure on rank 11–15 players to settle for Top 25 increases. Watching rank 9 claim is a signal that either (a) rank 10 is next or (b) someone has just backfilled from rank 11 into rank 10.

This creates natural urgency without needing a countdown timer.

---

## The Dual Leaderboard

### Global Leaderboard (off-chain)
- Every player who has earned any points, qualified or not
- Ordered by `user_points.total_points DESC`
- Updated instantly after each match
- **For engagement and social bragging**
- **Does NOT determine prizes**

### Prize Leaderboard (on-chain, qualification-gated)
- **Rank metric**: `PSLPoints.balanceOf(wallet)` — the transferable wallet balance
- **Qualification filter**: `PSLPoints.earnedBalance(wallet) >= 1,000 BNDY` — unqualified wallets never appear regardless of balance
- **Claim gate** (not a rank condition): `earnedBalance >= 10,000 BNDY`, enforced by the contract at `claimTier()`
- Read via viem multicall against both contracts (one batched RPC call per refresh)
- Refreshed lazily on `/api/leaderboard/prize` when the snapshot is >30s stale
- **Authoritative — the ONLY leaderboard that determines prize eligibility**

### Why Two?
- The global leaderboard gives **everyone** a sense of ranking and progress, reducing the paywall-like feeling of "you must sync to matter"
- The prize leaderboard gives **qualified players** a trustless, transparent, and market-reactive mechanism to compete for rewards
- The gap between them creates **strategic space** (Layers 3 and 4 above)
- It lets the UX surface nudges: *"You're rank #47 globally but not on the prize board yet. Earn 1,000 BNDY and sync to compete."*

### Why `balanceOf` and not `earnedBalance` for ranking?
Earlier design iterations ranked by `earnedBalance` to fully block pay-to-win. That was safer but flattened the token economy — transfers and trading had no leaderboard consequence, making BNDY a score display rather than a live asset. The current model ranks by `balanceOf` so trading, gifting, and DEX activity are real game mechanics, then gates qualification (1k earned) and claiming (10k earned) to prevent pure whales from capturing the board or the prizes. See [`TOKENOMICS.md`](./TOKENOMICS.md) and [`SECURITY.md`](./SECURITY.md) for the full invariant list.

---

## Tournament Lifecycle

### Phase 1 — Open (team picking)
- Users register, pick teams
- No matches played yet
- No points earned
- No prize claims possible

### Phase 2 — Active (matches playing)
- Matches scored one by one via admin panel
- Points accumulate in DB
- Users may sync whenever they want
- Prize leaderboard starts populating
- Claims become possible as soon as any player hits rank + earned threshold
- Stock depletes over time

### Phase 3 — Closed (tournament ends)
- Admin marks tournament complete
- No more matches will be scored
- Claiming remains open for a grace period (e.g. 48h after final match)
- After grace period, unclaimed prizes are logged as "unclaimed" and can roll to next tournament

### Phase 4 — Archive
- Final prize leaderboard frozen
- Trophies remain soulbound in winners' wallets forever
- Residual BNDY remains tradeable
- New tournament can begin with fresh `earnedBalance` reset (v2 admin function)

---

## Balance & Tuning Targets

These are the knobs to tune on Day 2 based on demo scenarios:

| Parameter | Current | Tune if... |
|---|---|---|
| `MIN_EARNED_TO_CLAIM` (on-chain) | 10,000 BNDY | Too restrictive (nobody crosses the claim gate) or too loose (everyone claims immediately). **Requires contract redeploy to change.** |
| `MIN_EARNED_FOR_LEADERBOARD` (backend) | 1,000 BNDY | Leaderboard is too empty (raise) or too spammy (raise further). **Backend constant, no redeploy.** |
| Salary cap | 100 credits | Teams are too homogenized / all-star / all-budget |
| Point formula | See above | Bowlers vs batsmen earn wildly different amounts |
| Tier stock counts | 1/3/10/25/50 | Prizes get claimed too fast or too slow |
| Number of matches | 2-3 (demo) | Tournament ends without meaningful ranking |

`MIN_EARNED_TO_CLAIM` is the only on-chain value and should be admin-settable in v2. `MIN_EARNED_FOR_LEADERBOARD` lives in `packages/shared/constants.ts` and can be tuned between deploys.

---

## Out of Scope (v1 / hackathon)

- ❌ Multiple concurrent tournaments
- ❌ Leagues / private contests
- ❌ Captain multipliers (maybe Day 2 stretch)
- ❌ Substitution windows
- ❌ Live-updating match data (requires real oracle integration)
- ❌ Dynamic player pricing based on form
- ❌ Player cards as NFTs
- ❌ Post-tournament leaderboard archival UI
- ❌ Mobile app (web-only for demo)

All captured in [`ROADMAP.md`](./ROADMAP.md).
