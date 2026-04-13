# Demo Transactions

> Canonical record of every on-chain transaction for the BoundaryLine hackathon demo. This page is maintained for judges — every hash here is verifiable on `https://wirefluidscan.com`.

**Network**: WireFluid Testnet (chain ID `92533`)
**Explorer base**: `https://wirefluidscan.com`
**Tournament**: PSL 2026 — Demo

---

## Deployed Contracts

| Contract | Address | Deploy Tx | Verified |
|---|---|---|---|
| `PSLPoints` (BNDY ERC-20) | `0x________________________________________` | `0x________________________________________` | TBD |
| `PSLTrophies` (Soulbound ERC-721) | `0x________________________________________` | `0x________________________________________` | TBD |

**Wiring tx** — `PSLPoints.setTrophies(PSLTrophies address)`:
`0x________________________________________`

---

## Backend Signer

The EOA that signs EIP-712 sync & claim vouchers. **Not** user-facing; included here so judges can verify voucher signatures on-chain against this address.

| Role | Address |
|---|---|
| Trusted Signer | `0x________________________________________` |

---

## Admin Actions — Match Scoring

Every match scored through the admin panel triggers an off-chain point update (no on-chain tx). Listed here for chronology context only.

| # | Match | Scored at | Players affected | Total points awarded |
|---|---|---|---|---|
| 1 | TBD vs TBD | TBD | TBD | TBD |
| 2 | TBD vs TBD | TBD | TBD | TBD |
| 3 | TBD vs TBD | TBD | TBD | TBD |

---

## User Sync Transactions

Each row is a `PSLPoints.sync(amount, nonce, signature)` call, minting BNDY to a player's wallet and incrementing their on-chain `earnedBalance`.

| # | Player (wallet) | Amount (BNDY) | Tx hash | Block | Timestamp |
|---|---|---|---|---|---|
| 1 | `0x____________...` | ________ | `0x____________...` | ________ | `YYYY-MM-DD HH:MM:SS UTC` |
| 2 | `0x____________...` | ________ | `0x____________...` | ________ | `YYYY-MM-DD HH:MM:SS UTC` |
| 3 | `0x____________...` | ________ | `0x____________...` | ________ | `YYYY-MM-DD HH:MM:SS UTC` |
| 4 | `0x____________...` | ________ | `0x____________...` | ________ | `YYYY-MM-DD HH:MM:SS UTC` |
| 5 | `0x____________...` | ________ | `0x____________...` | ________ | `YYYY-MM-DD HH:MM:SS UTC` |

Each tx emits a `Synced(user, amount, newEarnedTotal, nonce)` event. Judges can verify by loading the tx on `wirefluidscan.com` and decoding the log.

---

## Claim Transactions

Each row is a `PSLPoints.claimTier(tierId, nonce, signature)` call. This single tx burns the caller's entire BNDY balance, resets their `earnedBalance` to 0, and mints a soulbound trophy NFT via cross-contract call to `PSLTrophies.mintTrophy()`.

| # | Player | Tier claimed | Burned amount | Trophy tokenId | Tx hash | Block |
|---|---|---|---|---|---|---|
| 1 | `0x____________...` | Rank 1 | ________ | ________ | `0x____________...` | ________ |
| 2 | `0x____________...` | Top 3 | ________ | ________ | `0x____________...` | ________ |
| 3 | `0x____________...` | Top 10 | ________ | ________ | `0x____________...` | ________ |
| 4 | `0x____________...` | Top 25 | ________ | ________ | `0x____________...` | ________ |
| 5 | `0x____________...` | Top 50 | ________ | ________ | `0x____________...` | ________ |

Each tx emits:
- `TierClaimed(user, tierId, burnedAmount, trophyTokenId)` on `PSLPoints`
- `TrophyMinted(winner, tokenId, tierId, tournamentId)` on `PSLTrophies`

---

## Sample Transfer Transactions (Transferability Showcase)

To demonstrate that BNDY is a standard transferable ERC-20 (not soulbound), we include a couple of user-to-user transfers. These are for the demo narrative only; they do not affect `earnedBalance` or prize eligibility.

| # | From | To | Amount | Tx hash |
|---|---|---|---|---|
| 1 | `0x____________...` | `0x____________...` | ________ | `0x____________...` |
| 2 | `0x____________...` | `0x____________...` | ________ | `0x____________...` |

---

## Transferability Defense Verification

To prove the pay-to-win mitigation works, we include one transaction where a wallet **received** BNDY via transfer and **attempted to claim** without having earned the minimum. The tx should revert with `"Below minimum"` because `earnedBalance` is zero.

| Attacker wallet | Received amount | Claim attempt tx | Revert reason |
|---|---|---|---|
| `0x____________...` | ________ BNDY | `0x____________...` | `Below minimum` |

This failed tx is a positive demo: it shows the `earnedBalance` gate blocking a token-based attack exactly as designed.

---

## Trophy NFT Reads

Not transactions, but explorer links judges can use to see the minted soulbound trophies in winners' wallets.

| Winner | Trophy tokenId | tokenURI (on-chain data URI) |
|---|---|---|
| `0x____________...` | ________ | View on `wirefluidscan.com/address/<PSLTrophies>/tokens/<tokenId>` |

---

## How This File Is Maintained

- **On contract deploy**: `packages/contracts/scripts/deploy.ts` writes contract addresses and the deploy tx hashes to `packages/contracts/deployments/wirefluid-testnet.json`. A helper script reads that JSON and updates this page.
- **On sync**: the `/api/sync` endpoint writes to the `synced_record` table (see [`DATA_MODEL.md`](./DATA_MODEL.md)). After each demo sync the admin runs `pnpm demo:sync-log` to append a row here.
- **On claim**: same pattern via the `claim` table and `pnpm demo:claim-log`.
- **Manual**: the team also updates this file by hand during the demo as each notable tx completes, so judges can follow along live.

**Every hash on this page can be verified by loading it on `https://wirefluidscan.com/tx/<hash>`**. We make no claims we can't back up with the explorer.

---

## Live Demo Checklist

Before demo time, verify:

- [ ] Both contract addresses filled in above
- [ ] Both deploy txs filled in and loading on the explorer
- [ ] At least 3 sync transactions completed and logged
- [ ] At least 2 claim transactions completed and logged (ideally across different tiers)
- [ ] At least 1 transferability demonstration (simple send)
- [ ] The "failed claim attempt" row filled in with the deliberate revert demo
- [ ] Trophy NFTs visible in winning wallets via explorer
- [ ] This file committed to `main` and pushed to GitHub so judges can access the latest version

---

## Related Docs

- [`CONTRACTS.md`](./CONTRACTS.md) — what each tx actually does under the hood
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full data flow from UI to chain
- [`WIREFLUID.md`](./WIREFLUID.md) — network config, explorer URLs
- [`SECURITY.md`](./SECURITY.md) — why we structured the defense this way
