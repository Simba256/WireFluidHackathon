# Tokenomics

> BNDY — BoundaryLine Points. Design, supply, sinks, and anti-abuse guarantees.

---

## At A Glance

| Property | Value |
|---|---|
| Name | BoundaryLine Points |
| Symbol | `BNDY` |
| Standard | ERC-20 (transferable) |
| Decimals | 18 |
| Chain | WireFluid testnet (chain ID 92533) |
| Max supply | Uncapped; bounded per tournament by gameplay |
| Mint authority | `PSLPoints` contract, gated by backend-signed vouchers |
| Burn conditions | `claimTier()` burns entire claimant wallet balance |
| Earned tracking | `earnedBalance` mapping — monotonic, survives transfers |
| Leaderboard rank metric | `balanceOf` (transferable wallet balance) |
| Leaderboard qualification + prize claim floor | 10,000 BNDY earned |

---

## Design Principles

### 1. The token is a game score, not an investment
BNDY exists to measure and reward gameplay in BoundaryLine. It has no promise of yield, no presale, no team allocation, no treasury, no vesting schedule. Every token in circulation was earned by a player picking a team and scoring points. There is no path for BNDY to be acquired except:

- **Playing the game and syncing** — the primary path
- **Receiving from another player** — peer-to-peer transfer or DEX trade

There is no buy button in BoundaryLine itself. Tradability exists because the token is standard ERC-20, not because BoundaryLine operates a market.

### 2. Play-to-qualify, pay-to-rank
This is the most important tokenomic decision. Two wallet-level numbers are tracked:

- **`balanceOf(user)`** — ERC-20 wallet balance. Can be acquired via transfer, DEX buy, gift. **This is the leaderboard rank metric.**
- **`earnedBalance[user]`** — cumulative tokens earned through `sync()` (i.e. through play). **Never incremented by transfers.** **Never decremented** except on `claimTier()`. **This is the qualification gate, not the rank metric.**

BoundaryLine ranks wallets by `balanceOf DESC`, filtered to wallets with `earnedBalance >= 10,000 BNDY`. The same 10k earned threshold is also the contract-enforced claim gate — a single number that gates both visibility and prize redemption.

**Translation**:
- **You must earn your seat at the table.** Until you have personally earned 10,000 BNDY through real match performance and synced it on-chain, you are invisible on the prize leaderboard and cannot claim anything. Pure whales with zero earned are blocked by construction.
- **Once you're qualified, buying BNDY moves your rank.** Trading, gifting, and DEX activity are legitimate, intentional paths to climbing. A qualified player at rank #15 can buy their way into the Top 10 and claim the signed bat — because they've already proven they can play.
- **Bought tokens count for rank, not for qualification.** If you earn 10k, sync it, then buy 50k more — you now hold 60k `balanceOf` (high rank) but your `earnedBalance` is still 10k (just barely qualified). You can claim. If a whale buys 1M BNDY with zero earned, they still cannot claim, cannot rank, cannot see themselves on the leaderboard.

**Why rank by `balanceOf` at all?**: transferable tokens unlock the WireFluid DeFi narrative — real secondary markets, gifts, liquidity, DEX listings, cross-wallet consolidation. Ranking by `balanceOf` makes all of that economically meaningful instead of leaderboard-irrelevant. The earned floor preserves the invariant that **zero-play whales cannot win** without sacrificing the tradability that makes the token interesting.

**Why one threshold and not two?**: an earlier version of this spec had a softer 1k visibility floor and a strict 10k claim gate. It was simpler to replace both with a single 10k threshold: one constant, one mental model, one pitch line ("earn 10k BNDY to enter the prize leaderboard"). The engagement-for-new-players story is handled by the **global leaderboard** (off-chain, inclusive, ranks by total earned points from match performance), which already captures everyone from their first point.

### 3. Free-to-play, gas-only
BoundaryLine never charges money for entry, team creation, or gameplay. The only cost a user can incur is WireFluid gas fees, paid directly to validators, for actions they choose:

- **Connecting wallet** — free (no tx)
- **Picking a team** — free (off-chain)
- **Earning points** — free (off-chain)
- **Syncing points on-chain** — user pays ~$0.0005 gas
- **Claiming a prize** — user pays ~$0.001 gas
- **Transferring BNDY** — user pays ~$0.0002 gas

We take no fees, run no treasury, hold no fund. This positions BoundaryLine clearly as a **skill-based game with rewards**, not a gambling operation or token sale.

---

## Supply Mechanics

### Emission
BNDY is minted exclusively through `PSLPoints.sync()`, and only when:
1. The caller provides a valid EIP-712 voucher signed by the backend `trustedSigner`
2. The voucher's nonce has not been used before
3. The amount is non-zero

The backend signs vouchers corresponding to points the user has **actually earned off-chain** through gameplay. The backend never signs vouchers for nonexistent play.

**Per-tournament total supply** ≈ `Σ (playerScore × teamsContaining(player))` over all matches in the tournament. A finite number determined entirely by real cricket performance and how many players picked each performer.

For PSL 2026 (10 matches in the group stage, ~40 players per squad, expected player pools, and typical scoring ranges), we estimate per-tournament minted supply of **5M–50M BNDY** depending on engagement. No pre-mint, no faucet, no airdrop.

### Burning
BNDY is burned in exactly one situation: when a player calls `claimTier()` to claim a tournament prize, their **entire wallet balance** is burned atomically inside the transaction. This includes both earned and received tokens — the contract does not attempt to distinguish.

This "burn everything on claim" design has three rationales:
- **Simple accounting** — no splitting balances into tranches
- **Removes gifted-token exploits** — a player cannot hoard gifted BNDY for value extraction after claiming
- **Creates narrative weight** — the claim is a full commitment, all tokens gone, trophy received

### Net flow per tournament
```
Minted  = Σ earnedBalance across all players (after all syncs)
Burned  = Σ walletBalance of all claimants at claim time
Residue = Minted − Burned
       ≈ unclaimed winners' points + unsynced losers' points + transferred-out-without-claim balances
```

Residue remains in circulation. For the hackathon demo, there will be residual BNDY in wallets after the tournament — these can be frozen, migrated to the next tournament, or left in the wild. Decision deferred to post-hackathon.

---

## Anti-Abuse Guarantees

### Pure-whale attack (buy leaderboard position or prize with zero play)
**Attack**: Acquire BNDY via DEX or transfer without playing, try to appear on the leaderboard or claim a top-tier prize.
**Mitigation**: both the backend leaderboard snapshot query and the on-chain `claimTier()` function enforce `earnedBalance >= 10,000 BNDY`. A wallet with zero or low earned balance never appears on the leaderboard regardless of `balanceOf`, and the contract reverts any claim attempt. The backend reads `earnedBalance` from the contract via multicall — it cannot be faked.
**Result**: every attempt to bypass real play through capital fails at the same gate. The 10k earned threshold is the single binding constraint for both visibility and prize redemption.

### Sybil / wallet farming
**Attack**: Create 1000 wallets, earn minimal amounts in each, claim 1000 low-tier prizes.
**Mitigation**:
- `MIN_EARNED_TO_CLAIM = 10,000 BNDY` — every wallet must personally earn this much through play before it can claim anything
- SIWE requires each wallet to actually exist and sign messages
- v2: rate-limit team creation, proof-of-humanity

### Voucher replay (Nonce gating)
Every sync and claim voucher has a unique `nonce`. The contract tracks `usedNonces[nonce]` and rejects duplicates. The backend generates nonces from a monotonic counter + wallet address salt.

### Signer compromise (Single point of failure)
The backend signer private key is the trust anchor. If compromised, an attacker could mint arbitrary BNDY to any wallet. Mitigations:
- Stored in Vercel environment variables (not in git)
- Rotated after hackathon
- v2: multisig signer or threshold-signed vouchers
- v2: per-match Merkle commitments published on-chain, allowing users to verify their own points

---

## Distribution

**100% of BNDY is minted directly to players as they earn points through gameplay.**

There is no:
- ❌ Team allocation
- ❌ Treasury reserve
- ❌ Private sale
- ❌ Public sale
- ❌ Airdrop
- ❌ Liquidity provision from the team
- ❌ Vesting schedule
- ❌ Foundation stake

The only address that ever receives BNDY is a player who synced earned points.

This is deliberate. It keeps BoundaryLine clearly on the "game with prizes" side of the regulatory spectrum, eliminates token-sale compliance concerns, and aligns incentives — the team's only way to make the token valuable is to make the game good.

---

## Trophy NFTs (PSLTrophies, soulbound)

BNDY is paired with a separate, **non-transferable** ERC-721 contract: `PSLTrophies`.

When a player claims a prize tier:
1. Their BNDY is burned
2. A trophy NFT is minted to their wallet
3. The trophy is soulbound — it cannot be transferred, ever

**Why soulbound trophies when BNDY itself is transferable?** Because trophies represent **achievement identity**, not currency. The point of a "Top 10 Finisher" trophy is that it proves the holder personally reached the top 10. If it were tradeable, anyone could buy one and fake their record. That breaks the achievement meaning entirely.

Trophies have no market value. They are reputation.

---

## Value Accrual (What Makes BNDY "Worth" Anything)

Honest answer: **BNDY has no guaranteed value**. It is a game score represented as a token. Its value to a qualified holder (someone with ≥10k earned) is:

1. **Leaderboard rank** — `balanceOf` directly determines rank among qualified wallets. More tokens held (earned OR received) = higher rank. This creates legitimate demand among qualified players to acquire more BNDY.
2. **Prize eligibility** — if your rank falls in a tier band and stock is available, you can burn your wallet balance at claim time for a real prize + trophy. (Qualification is already satisfied if you're on the board at all.)
3. **Identity/status** — holding large earned amounts demonstrates play competence; holding large total amounts demonstrates commitment and/or capital.
4. **Secondary market** — anyone may list BNDY on a DEX. Because rank depends on `balanceOf`, this market has real utility to qualified players who want to climb without waiting for the next match.

**Critical caveat for speculators**: buying BNDY is worthless to anyone who hasn't earned 10,000 BNDY through real play. The token has zero leaderboard utility for unqualified wallets. This is deliberate — it keeps casual speculators out and ensures secondary-market demand comes from actual players.

We make no claims about BNDY having a floor price, exchange rate, or future value. Regulators and users should understand: **this is game scoring with an intentional secondary market for qualified players, not currency**.

---

## Post-Tournament Lifecycle

At the end of a tournament:
- All prizes have been claimed by tier winners (or remain unclaimed → rollover)
- Claimants have 0 BNDY and 1 trophy
- Non-claimants may hold residual BNDY in their wallet

**Default behavior for residual BNDY**: nothing happens. Tokens remain in the wallet. The contract is not paused. Transfers continue to work.

**Optional v2 behaviors**:
- **Snapshot + migration** — snapshot holders, mint a new `BNDY-v2` contract for the next tournament, distribute to holders proportionally
- **Burn residual** — admin function to zero out holders after tournament end (controversial, avoid)
- **Reset `earnedBalance`** — admin function to clear earned tracking across the board, letting residual holders re-enter the next tournament without claim advantage

Decision deferred to post-hackathon.

---

## Pitch Framing

> *"BoundaryLine mints BNDY only when real cricket happens. Every run by Babar, every wicket by Shaheen, becomes tokens for the fans who picked them. Earn 10,000 BNDY through real play and you're on the prize leaderboard. From there, climb by playing more, trading, gifting, or buying — because rank is decided by wallet balance, not earned history. But you can't shortcut the 10k entry fee. Play to qualify. Pay to rank. Earn to win."*
