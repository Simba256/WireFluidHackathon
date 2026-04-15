# Demo Transactions

> Canonical record of every on-chain transaction for the BoundaryLine hackathon demo. This page is maintained for judges — every hash here is verifiable on `https://wirefluidscan.com`.

**Network**: WireFluid Testnet (chain ID `92533`)
**Explorer base**: `https://wirefluidscan.com`
**Tournament**: PSL 2026 — Demo

---

## Deployed Contracts

| Contract | Address | Deploy Tx | Verified |
|---|---|---|---|
| `PSLPoints` (BNDY ERC-20) | [`0x785FAE9B7C7801173bc1Dc1e38A9ae827137abBc`](https://wirefluidscan.com/address/0x785FAE9B7C7801173bc1Dc1e38A9ae827137abBc#code) | [`0x2e1afa3f...80b606c`](https://wirefluidscan.com/tx/0x2e1afa3f66758afc3e1f0a87afda862f14bd5ff32f5b30b7b4cdd253c80b606c) | ✅ |
| `PSLTrophies` (Soulbound ERC-721) | [`0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7`](https://wirefluidscan.com/address/0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7#code) | [`0x4733d026...3ec0cf11`](https://wirefluidscan.com/tx/0x4733d02607dcec765d121be7bae1e6484ae8f7f446b2b5349e264d9a3ec0cf11) | ✅ |

**Deployer**: `0x51bB66D97d36C5942D53a00D74553629a2E15cB4`

**Wiring tx** — `PSLPoints.setTrophies(PSLTrophies address)`:
[`0x8b660758...590409d6`](https://wirefluidscan.com/tx/0x8b660758008ee38583798d48ba812c127c34a4ee8cf5fd95a7da3bd5590409d6) (block 881404)

---

## Backend Signer

The EOA that signs EIP-712 sync & claim vouchers. **Not** user-facing; included here so judges can verify voucher signatures on-chain against this address.

| Role | Address |
|---|---|
| Trusted Signer | [`0xeCBBF715d35FdD6f56316fb1B64B89C1B329aCd1`](https://wirefluidscan.com/address/0xeCBBF715d35FdD6f56316fb1B64B89C1B329aCd1) |

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

| # | Player (wallet) | Amount (BNDY) | Tx hash | Block | Timestamp (UTC) |
|---|---|---|---|---|---|
| 1 | `0x400b9e86dca96e775578ad95df095e6d9fac00d6` | 586 | [`0x265b0b52...973954b7`](https://wirefluidscan.com/tx/0x265b0b520343634ed31eb06d7ebf38412aa12b2a6aa7022a5b3919e1973954b7) | 899539 | 2026-04-14 19:28:53 |
| 2 | `0x6f3cc21a83e4ca306afd8b973c6281466157e17c` | 16,750 | [`0x4353665f...a7835468`](https://wirefluidscan.com/tx/0x4353665f3e565cf35f3cec45ebafbe6a0d9c227af9738d644eb02127a7835468) | 901536 | 2026-04-14 22:39:46 |
| 3 | `0x400b9e86dca96e775578ad95df095e6d9fac00d6` | 6,969,696,410 | [`0x5e8b9fdd...a1a6699b`](https://wirefluidscan.com/tx/0x5e8b9fdd0d9733e38fb7da22b8565ed982585e609264a0dd3ca21c96a1a6699b) | 901608 | 2026-04-14 22:46:38 |
| 4 | `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` | 526,236 | [`0xa9eeaf8f...dcb149d8`](https://wirefluidscan.com/tx/0xa9eeaf8fc263ada499245ab10ed25c662aa7870569d582a5732be257dcb149d8) | 902255 | 2026-04-14 23:48:26 |
| 5 | `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` | 1,000,000 | [`0xb5d5fb11...624503ca`](https://wirefluidscan.com/tx/0xb5d5fb11e5c98af8324fd2fd7796538bc40001ab5ff2d4b7400a372e624503ca) | 902972 | 2026-04-15 00:56:54 |
| 6 | `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` | 973,764 | [`0xde8ac529...268c7bef`](https://wirefluidscan.com/tx/0xde8ac529e98d959b753ad22d199f1fa7c1bc643e353e1779e39906e9268c7bef) | 903072 | 2026-04-15 01:06:25 |
| 7 | `0xc51bd4700a71b7d9473e9ef688b7cb49a13e43bf` | 34,379 | [`0x9dd64921...8e140df9`](https://wirefluidscan.com/tx/0x9dd64921119da1bd0a403ae916cdaeeff2de3c0ec1c6cc006da5481e8e140df9) | 907257 | 2026-04-15 07:46:11 |

Each tx emits a `Synced(user, amount, newEarnedTotal, nonce)` event. Judges can verify by loading the tx on `wirefluidscan.com` and decoding the log.

---

## Claim Transactions

Each row is a `PSLPoints.claimTier(tierId, nonce, signature)` call. This single tx burns the caller's entire BNDY balance, resets their `earnedBalance` to 0, and mints a soulbound trophy NFT via cross-contract call to `PSLTrophies.mintTrophy()`.

| # | Player | Tier claimed | Trophy tokenId | Tx hash | Block |
|---|---|---|---|---|---|
| 1 | `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` | Rank 1 | 2 | [`0x132d67aa...220b81f4`](https://wirefluidscan.com/tx/0x132d67aae69e685c9400490a8fcc6b4ce0dcbfc4341e96ecff09baa8220b81f4) | — |
| 2 | `0x400b9e86dca96e775578ad95df095e6d9fac00d6` | Rank 1 | 3 | [`0x7dc42b82...d7e4b71a`](https://wirefluidscan.com/tx/0x7dc42b82d6b37992dcacbf71889bad31c405a04de9476a41cffc7623d7e4b71a) | — |
| 3 | `0xc51bd4700a71b7d9473e9ef688b7cb49a13e43bf` | Top 3 | 4 | [`0x9648bc36...e685965c6a`](https://wirefluidscan.com/tx/0x9648bc36b894ce3580ae6a2fe850d24ace7a6b9d657493924410f9e685965c6a) | 907295 |

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

## Pure-Whale Defense Verification

To prove the pure-whale mitigation works, we include one transaction where a wallet **received** BNDY via transfer (no earned history) and **attempted to claim** a prize. The tx should revert with `"Below minimum"` because `earnedBalance` is zero, regardless of how much BNDY the wallet holds.

| Attacker wallet | Received amount | Claim attempt tx | Revert reason |
|---|---|---|---|
| `0x____________...` | ________ BNDY | `0x____________...` | `Below minimum` |

This failed tx is a positive demo: the `earnedBalance` gate blocks the token-based attack exactly as designed. The same filter also hides this wallet from `/api/leaderboard/prize` — it never appears on the rankings — so the defense is symmetric in the UI and the contract.

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
