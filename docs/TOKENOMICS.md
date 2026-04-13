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
| Minimum for prize claim | 10,000 BNDY earned |

---

## Design Principles

### 1. The token is a game score, not an investment
BNDY exists to measure and reward gameplay in BoundaryLine. It has no promise of yield, no presale, no team allocation, no treasury, no vesting schedule. Every token in circulation was earned by a player picking a team and scoring points. There is no path for BNDY to be acquired except:

- **Playing the game and syncing** — the primary path
- **Receiving from another player** — peer-to-peer transfer or DEX trade

There is no buy button in BoundaryLine itself. Tradability exists because the token is standard ERC-20, not because BoundaryLine operates a market.

### 2. Earned ≠ held
This is the most important tokenomic decision. Two wallet-level numbers are tracked:

- **`balanceOf(user)`** — ERC-20 wallet balance. Can be acquired via transfer. Can be sent, traded, gifted.
- **`earnedBalance[user]`** — cumulative tokens earned through `sync()` (i.e. through play). **Never incremented by transfers.** **Never decremented** except on `claimTier()`.

Prize eligibility uses `earnedBalance`. Transfers do not move earned status with them.

**Why**: A transferable token is valuable for user UX (gifts, liquidity, DeFi composability) and for the WireFluid DeFi narrative. But a leaderboard that reads `balanceOf` is trivially attacked — a whale with $500 could buy up supply from casual players and instantly top the rankings without touching a cricket match. Tracking earned-vs-held separately gives us the best of both worlds: **liquid token, protected game**.

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

### Pay-to-win attacks (Tradeable tokens, normally a fatal flaw)
Without safeguards, a whale could buy BNDY on a DEX and claim top-tier prizes. BoundaryLine blocks this via the **earned-balance check**:

```
Require: earnedBalance[msg.sender] >= MIN_EARNED_TO_CLAIM
```

`earnedBalance` only grows when the user personally completes a `sync()` call authorized by the backend — which the backend only signs for legitimately earned off-chain points. No amount of DEX purchases can raise `earnedBalance`. The attack fails.

### Minimum earned threshold (Sybil mitigation)
`MIN_EARNED_TO_CLAIM = 10,000 BNDY`. To claim any prize, a wallet must have **personally earned** at least 10k BNDY through play. This raises the cost of Sybil attacks (creating fake wallets to farm small claims) to the cost of playing the game 10k points worth, per wallet, which is substantial.

For the hackathon this threshold is a constant but should be made admin-updatable in v2 so it can be tuned to the observed distribution of legitimate play.

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

Honest answer: **BNDY has no guaranteed value**. It is a game score represented as a token. Its value to a holder is entirely:

1. **Prize eligibility** — if you earned ≥10k BNDY and hold BNDY at claim time, and your rank is in a tier band, you can convert the wallet balance into a real prize + trophy
2. **Identity/status** — holding large earned amounts demonstrates play competence
3. **Optional secondary market** — anyone may list BNDY on a DEX if they wish, and speculators may trade it based on perceived scarcity or prize proximity, but this market is neither endorsed nor operated by BoundaryLine

We make no claims about BNDY having a floor price, exchange rate, or future value. Regulators and users should understand: **this is game scoring, not currency**.

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

> *"BoundaryLine mints BNDY tokens only when real cricket happens. Every run by Babar Azam, every wicket by Shaheen Afridi, translates into tokens for the fans who picked them. You can hold it, send it, trade it on a DEX. But you can only win a real prize by actually playing. The token is transferable; the achievement is earned."*
