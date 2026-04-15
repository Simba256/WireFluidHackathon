# BoundaryLine — On-Chain Transactions for Judges

All transactions below were executed on **WireFluid Testnet** (chain ID `92533`) by the live BoundaryLine app. Every hash is verifiable on the explorer.

- **Explorer**: https://wirefluidscan.com
- **App**: https://wire-fluid-hackathon-web.vercel.app
- **Tx URL format**: `https://wirefluidscan.com/tx/<hash>`
- **BNDY Token Address**: `0x785FAE9B7C7801173bc1Dc1e38A9ae827137abBc`
  - https://wirefluidscan.com/token/0x785FAE9B7C7801173bc1Dc1e38A9ae827137abBc
- **PSLTrophies NFT Address**: `0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7`
  - https://wirefluidscan.com/token/0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7

---

## Deployed Contracts

**`PSLPoints` (BNDY ERC-20)**
- Address: `0x785FAE9B7C7801173bc1Dc1e38A9ae827137abBc`
- Deploy tx: `0x2e1afa3f66758afc3e1f0a87afda862f14bd5ff32f5b30b7b4cdd253c80b606c`
- https://wirefluidscan.com/tx/0x2e1afa3f66758afc3e1f0a87afda862f14bd5ff32f5b30b7b4cdd253c80b606c

**`PSLTrophies` (Soulbound ERC-721)**
- Address: `0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7`
- Deploy tx: `0x4733d02607dcec765d121be7bae1e6484ae8f7f446b2b5349e264d9a3ec0cf11`
- https://wirefluidscan.com/tx/0x4733d02607dcec765d121be7bae1e6484ae8f7f446b2b5349e264d9a3ec0cf11

**Wiring** — `PSLPoints.setTrophies(...)` (one-shot, immutable after)
- Tx: `0x8b660758008ee38583798d48ba812c127c34a4ee8cf5fd95a7da3bd5590409d6`
- https://wirefluidscan.com/tx/0x8b660758008ee38583798d48ba812c127c34a4ee8cf5fd95a7da3bd5590409d6

Both contracts are source-verified on `wirefluidscan.com`.

---

## Sync Transactions — `PSLPoints.sync(voucher, signature)`

Each call verifies a backend-signed EIP-712 voucher, mints BNDY to the user, and increments their on-chain `earnedBalance`. Emits `Synced(user, amount, newEarnedTotal, nonce)`.

**1.** Wallet `0x400b9e86dca96e775578ad95df095e6d9fac00d6` — 586 BNDY — block 899539
- `0x265b0b520343634ed31eb06d7ebf38412aa12b2a6aa7022a5b3919e1973954b7`
- https://wirefluidscan.com/tx/0x265b0b520343634ed31eb06d7ebf38412aa12b2a6aa7022a5b3919e1973954b7

**2.** Wallet `0x6f3cc21a83e4ca306afd8b973c6281466157e17c` — 16,750 BNDY — block 901536
- `0x4353665f3e565cf35f3cec45ebafbe6a0d9c227af9738d644eb02127a7835468`
- https://wirefluidscan.com/tx/0x4353665f3e565cf35f3cec45ebafbe6a0d9c227af9738d644eb02127a7835468

**3.** Wallet `0x400b9e86dca96e775578ad95df095e6d9fac00d6` — 6,969,696,410 BNDY — block 901608
- `0x5e8b9fdd0d9733e38fb7da22b8565ed982585e609264a0dd3ca21c96a1a6699b`
- https://wirefluidscan.com/tx/0x5e8b9fdd0d9733e38fb7da22b8565ed982585e609264a0dd3ca21c96a1a6699b

**4.** Wallet `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` — 526,236 BNDY — block 902255
- `0xa9eeaf8fc263ada499245ab10ed25c662aa7870569d582a5732be257dcb149d8`
- https://wirefluidscan.com/tx/0xa9eeaf8fc263ada499245ab10ed25c662aa7870569d582a5732be257dcb149d8

**5.** Wallet `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` — 1,000,000 BNDY — block 902972
- `0xb5d5fb11e5c98af8324fd2fd7796538bc40001ab5ff2d4b7400a372e624503ca`
- https://wirefluidscan.com/tx/0xb5d5fb11e5c98af8324fd2fd7796538bc40001ab5ff2d4b7400a372e624503ca

**6.** Wallet `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` — 973,764 BNDY — block 903072
- `0xde8ac529e98d959b753ad22d199f1fa7c1bc643e353e1779e39906e9268c7bef`
- https://wirefluidscan.com/tx/0xde8ac529e98d959b753ad22d199f1fa7c1bc643e353e1779e39906e9268c7bef

**7.** Wallet `0xc51bd4700a71b7d9473e9ef688b7cb49a13e43bf` — 34,379 BNDY — block 907257
- `0x9dd64921119da1bd0a403ae916cdaeeff2de3c0ec1c6cc006da5481e8e140df9`
- https://wirefluidscan.com/tx/0x9dd64921119da1bd0a403ae916cdaeeff2de3c0ec1c6cc006da5481e8e140df9

---

## Claim Transactions — `PSLPoints.claimTier(voucher, signature)`

A single atomic tx: burns the user's full BNDY balance, resets their `earnedBalance` to 0, and cross-calls `PSLTrophies.mintTrophy()` to mint a soulbound trophy NFT. Emits `TierClaimed` on `PSLPoints` and `TrophyMinted` on `PSLTrophies`. Trophy transfers revert (soulbound) — trophies prove achievement and cannot be traded.

**1.** Wallet `0x51bb66d97d36c5942d53a00d74553629a2e15cb4` — Tier: Rank 1 (Grand Prize) — Trophy tokenId: 2
- `0x132d67aae69e685c9400490a8fcc6b4ce0dcbfc4341e96ecff09baa8220b81f4`
- https://wirefluidscan.com/tx/0x132d67aae69e685c9400490a8fcc6b4ce0dcbfc4341e96ecff09baa8220b81f4

**2.** Wallet `0x400b9e86dca96e775578ad95df095e6d9fac00d6` — Tier: Rank 1 (Grand Prize) — Trophy tokenId: 3
- `0x7dc42b82d6b37992dcacbf71889bad31c405a04de9476a41cffc7623d7e4b71a`
- https://wirefluidscan.com/tx/0x7dc42b82d6b37992dcacbf71889bad31c405a04de9476a41cffc7623d7e4b71a

**3.** Wallet `0xc51bd4700a71b7d9473e9ef688b7cb49a13e43bf` — Tier: Top 3 — Trophy tokenId: 4
- `0x9648bc36b894ce3580ae6a2fe850d24ace7a6b9d657493924410f9e685965c6a`
- https://wirefluidscan.com/tx/0x9648bc36b894ce3580ae6a2fe850d24ace7a6b9d657493924410f9e685965c6a

---

## Minted Trophy NFTs

- Trophy #2 → https://wirefluidscan.com/token/0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7?a=2
- Trophy #3 → https://wirefluidscan.com/token/0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7?a=3
- Trophy #4 → https://wirefluidscan.com/token/0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7?a=4

---

**Total on-chain transactions shown**: 3 contract deploys/wiring + 7 syncs + 3 claims = **13 verifiable txs**.

Every hash can be pasted into https://wirefluidscan.com to inspect calldata, logs, and state changes.
