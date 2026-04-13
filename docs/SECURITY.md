# Security & Trust Model

> Honest accounting of what BoundaryLine trusts, what it doesn't, and the attack surface we care about.

---

## Trust Assumptions (plain English)

### What users must trust
1. **The backend signer** — it signs vouchers authorizing token mints. If compromised, an attacker could mint arbitrary BNDY to any wallet.
2. **The scoring engine** — points are calculated off-chain from match data. Users must trust we calculate them correctly.
3. **The match data source** — for v1 we manually enter match stats via an admin panel. Users must trust we enter accurate numbers.
4. **The DNS / Vercel deployment** — users must trust they're hitting the real `boundaryline.vercel.app`.

### What users do NOT need to trust
1. **Claim validity** — claims are cryptographically gated by the on-chain `earnedBalance >= 10,000 BNDY` check + signature verification. The backend cannot forge a claim without compromising the signer key.
2. **Trophy ownership** — trophies are soulbound ERC-721 tokens; once minted, they cannot be moved or revoked. The on-chain record is the truth.
3. **Leaderboard rank ordering** — reads `balanceOf` + `earnedBalance` directly from the contract via viem multicall. Rank positions cannot be faked by the backend — the filter (same 10k earned floor the contract enforces for claims) and the refresh schedule are both deterministic from on-chain state.
4. **Token custody** — users hold their own BNDY in their own wallet. The backend cannot move it.

### What BoundaryLine does NOT trust
1. **User input** — all API inputs are validated (Zod schemas on the server)
2. **Frontend code** — server never trusts values passed from the client for authoritative state; it always re-derives
3. **The chain for point calculations** — we calculate points ourselves, we don't rely on any on-chain oracle
4. **Admins for signer keys** — the signer key has a single job; admins cannot override it from the admin panel

---

## Threat Model

### Tier 1: Game-breaking attacks (must prevent)

> **Design context**: BoundaryLine ranks wallets by `balanceOf` and qualifies them by `earnedBalance >= 10,000 BNDY`. Pay-to-rank (buying BNDY to climb **after** you've earned your seat) is intentional. Pure whales (zero-play capital attacks) are the single attack category that must be blocked, and the 10k earned threshold handles both leaderboard visibility and prize claim eligibility with one number.

#### T1.1 — Pure-whale attack (buy rank or prize with zero play)
**Attack**: Acquire a massive BNDY balance via DEX or transfer without ever playing cricket, try to appear at Rank 1 or claim a top-tier prize.
**Mitigation**: a single on-chain-derived threshold enforced in two places:
- **Leaderboard visibility**: the backend snapshot query filters to `earnedBalance >= 10,000 BNDY`. A wallet with less than 10k earned is literally absent from the leaderboard response regardless of `balanceOf`. The snapshot table never inserts unqualified wallets.
- **Prize claim**: `PSLPoints.claimTier()` enforces `earnedBalance >= MIN_EARNED_TO_CLAIM` where `MIN_EARNED_TO_CLAIM = 10,000 BNDY` on-chain. Purchased tokens count toward `balanceOf` but contribute nothing to `earnedBalance`. Any claim by an unqualified wallet reverts.

Because `earnedBalance` only grows via `sync()` with a backend-signed voucher, and the backend only signs vouchers for legitimately earned off-chain points, no amount of DEX activity or wallet-to-wallet transfer can raise `earnedBalance`. The attack has no viable path.
**Status**: ✅ Mitigated both in backend (leaderboard filter) and on-chain (claim gate). Both enforcement points read `earnedBalance` directly from the contract — the backend filter cannot be weakened by lying about state, only by lowering the filter constant, which requires a code change + redeploy.
**Worth restating**: once a player has genuinely earned 10,000 BNDY through play and crossed the gate, they are free to buy additional BNDY on a DEX to improve their rank. That is pay-to-rank and is an intentional feature. It is distinct from pay-to-qualify, which is impossible.

#### T1.2 — Signer key compromise
**Attack**: Steal the signer private key, mint unlimited BNDY to attacker wallets.
**Mitigation**:
- Key stored as Vercel env var, not in git
- Never logged
- Never transmitted to client
- Backend instance runs on Vercel Fluid Compute (isolated execution)
- Post-hackathon: rotate to HSM / KMS; v2: multi-party signing
**Status**: ⚠️ Accepted risk for hackathon. Single point of failure documented.

#### T1.3 — Voucher replay
**Attack**: Intercept a signed voucher and submit it multiple times.
**Mitigation**: `usedNonces` mapping in `PSLPoints`. Any submitted nonce is marked used in the same transaction; second submission reverts.
**Status**: ✅ Mitigated in contract.

#### T1.4 — Double-claim in one tournament
**Attack**: Claim a Top 10 prize, then claim Top 25 for the same wallet.
**Mitigation**: `claimTier()` resets `earnedBalance` to 0 and burns the full wallet. Subsequent claim attempts fail the `earnedBalance >= MIN` check unless the user re-earns 10k+ points through additional play. DB also enforces one active claim per wallet per tournament via unique index.
**Status**: ✅ Mitigated at both layers.

### Tier 2: Bad-actor attacks (serious, should prevent)

#### T2.1 — Sybil / wallet farming
**Attack**: Create 1000 wallets, earn tiny amounts in each, claim 1000 low-tier prizes.
**Mitigation**:
- `MIN_EARNED_TO_CLAIM = 10,000 BNDY` — requires meaningful play per wallet
- SIWE requires each wallet to actually exist and sign messages
- Future: rate limit team creation, add proof-of-humanity (captcha) in v2
**Status**: ⚠️ Partially mitigated. Determined attackers can still script multiple wallets but the minimum raises the cost substantially.

#### T2.2 — Admin panel credential theft
**Attack**: Steal `ADMIN_API_KEY` and submit fake match scores to manipulate points.
**Mitigation**:
- Key stored as env var, rotated after hackathon
- Admin endpoints logged
- Post-hackathon: replace with authenticated admin users + audit log
**Status**: ⚠️ Accepted risk for hackathon.

#### T2.3 — Match data manipulation (by the operator)
**Attack**: The team submits false match data, inflating points for favored players.
**Mitigation**:
- For hackathon: none, manual admin panel
- v2: Merkle commitment of match data published on-chain, allowing disputes
- v2: Integration with official PSL data feeds via Chainlink Functions
**Status**: ⚠️ Accepted risk. Documented openly.

#### T2.4 — Frontend phishing
**Attack**: Attacker hosts a copy of the BoundaryLine UI at a lookalike domain, captures signatures or sends malicious tx requests.
**Mitigation**:
- SIWE domain check (message includes domain, wallet rejects mismatches)
- Encourage users to bookmark the canonical URL
- Post-demo: apply for a `.eth` ENS + canonical domain
**Status**: ⚠️ Standard web3 UX risk. Not unique to BoundaryLine.

### Tier 3: Nuisance attacks (annoying, acceptable)

#### T3.1 — Front-running claims
**Attack**: Watch the mempool for a player's pending `claimTier()` tx, submit your own claim first to snag the last slot in a tier.
**Mitigation**:
- Claim vouchers are user-bound (`msg.sender` check) so you can't reuse someone else's voucher
- Stock is first-come, first-served at the DB level (slot reserved on voucher issue, not on tx submission)
- Backend only issues a voucher after confirming stock, so the slot is yours from the moment the voucher is signed
**Status**: ✅ Mitigated at the backend (stock reserved before voucher issue).

#### T3.2 — DoS on voucher signing
**Attack**: Spam `/api/sync` or `/api/claim` to exhaust backend CPU or Neon connections.
**Mitigation**:
- Post-hackathon: add rate limiting on `/api/sync`, `/api/claim`, `/api/auth/nonce`
- Vercel has a soft rate limit at the platform level
**Status**: ⚠️ Not mitigated in v1. Acceptable for hackathon.

#### T3.3 — RPC read flooding for the prize leaderboard
**Attack**: Hit `/api/leaderboard/prize` constantly to exhaust WireFluid RPC quota.
**Mitigation**:
- Snapshot cached in Postgres with a 30s staleness window
- Lazy refresh: only the first stale read triggers a multicall; subsequent reads within 30s return cached data
- Multicall batches `balanceOf` + `earnedBalance` for all tracked wallets into one RPC call
- Transfer-log scanning uses a `last_scanned_block` cursor, never rescans history
**Status**: ✅ Mitigated via cache + lazy refresh.

#### T3.4 — Unbounded tracked-wallet growth
**Attack**: Generate thousands of wallets and send dust transfers of BNDY to bloat the `tracked_wallet` table and slow the leaderboard refresh multicall.
**Mitigation**:
- Tracked wallets are filtered at refresh time: only wallets with `earnedBalance >= 10,000 BNDY` appear on the leaderboard
- Dust-receiver wallets are tracked but never rank, and the multicall cost per wallet is cheap (~1ms)
- v2: prune tracked wallets with zero earned across N consecutive refreshes
**Status**: ✅ Operationally acceptable at hackathon scale. Watch in production.

---

## Smart Contract Security Checklist

### `PSLPoints.sol`
- [x] Uses OpenZeppelin `ERC20` v5 (audited)
- [x] Uses OpenZeppelin `ECDSA` + `EIP712` for signature verification
- [x] `trustedSigner` is `immutable` (cannot be changed post-deploy)
- [x] `usedNonces` prevents voucher replay
- [x] `earnedBalance` is only modified in controlled paths (sync, claim)
- [x] `claimTier` burns full balance (no partial burn edge cases)
- [x] `MIN_EARNED_TO_CLAIM` is a compile-time constant (10,000 BNDY, no admin backdoor) — serves as both the on-chain claim gate and the backend leaderboard visibility filter
- [x] No `tx.origin` usage
- [x] No unchecked external calls
- [x] `setTrophies` is one-shot (cannot be re-pointed after initial wiring)
- [x] Checked arithmetic (Solidity 0.8.x)
- [x] Slither + solhint clean (run in CI)

### `PSLTrophies.sol`
- [x] Uses OpenZeppelin `ERC721` v5 (audited)
- [x] `minter` is `immutable`
- [x] `_update` override enforces soulbound (blocks transfers)
- [x] Only `minter` can mint
- [x] No burn function (trophies permanent)
- [x] `tokenURI` generated on-chain (no IPFS failure mode)
- [x] Metadata is static per tier

---

## Incident Response Plan

If something goes wrong during or after the hackathon demo:

### Mild (UI bug, slow leaderboard)
- Roll back the Vercel deployment
- Fix, redeploy
- No on-chain action needed

### Moderate (backend issuing incorrect vouchers)
- Pause the admin panel (disable `ADMIN_API_KEY`)
- Identify scope of incorrect mints by scanning DB + chain events
- Document discrepancies
- Communicate to users: which mints were invalid, whether claims need to be revoked
- There is no on-chain rollback — communicate and compensate off-chain

### Severe (signer key compromised)
- Immediately rotate the env var (invalidates future vouchers)
- Cannot invalidate already-issued vouchers — any nonces already in `usedNonces[]` will still work if submitted
- Announce to users
- Take the site down until a new signer wallet is wired up
- v2 architectural fix: make `trustedSigner` upgradeable via admin multisig (sacrifices some trustlessness for operational safety)

### Catastrophic (contract bug allowing arbitrary mint or theft)
- The contracts are immutable, no pause function in v1 → **cannot fix on-chain**
- Mitigation: launch a new contract version, ask users to migrate, deprecate the old one
- v2: consider adding a pause function for emergencies (`Ownable` + `Pausable` from OZ)

---

## What's Explicitly Out Of Scope

These are NOT mitigated in v1, and we're documenting that openly:

- **Formal verification** of the contracts (too heavy for a hackathon)
- **External audit** by a professional firm (too expensive and slow)
- **Timelock governance** on admin actions
- **Decentralized oracle** for match data
- **Multi-sig** on signer and admin operations
- **Zero-knowledge proofs** for privacy-preserving rank claims
- **Upgradeability** (contracts are immutable by design for simplicity)

All in [`ROADMAP.md`](./ROADMAP.md).

---

## Responsible Disclosure

If you find a vulnerability, please report to the team privately. Do not open a public issue.

For the hackathon, just message the team. Post-hackathon, if the project continues, we'll set up a `security@` email and a bounty program.
