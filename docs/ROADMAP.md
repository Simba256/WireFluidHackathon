# Roadmap

> What BoundaryLine is today (v1 / hackathon) and where it's headed.

---

## v1 — Hackathon Demo (2026-04-13 → 2026-04-14)

**Goal**: A fully playable end-to-end demo on WireFluid testnet. One tournament. Everything working: team picking → scoring → syncing → claiming → trophy NFTs.

### Shipped
- ✅ Transferable ERC-20 `BNDY` with `earnedBalance` tracking
- ✅ Soulbound ERC-721 `PSLTrophies`
- ✅ SIWE wallet auth
- ✅ Team picker (11 players, salary cap)
- ✅ Off-chain scoring engine (admin panel)
- ✅ Dual leaderboard (global off-chain + prize on-chain)
- ✅ Sync flow with EIP-712 vouchers
- ✅ Claim flow with tier gating, minimum threshold, and stock limits
- ✅ Trophy showcase per user
- ✅ Vercel + Neon deployment

### Known limits
- Admin panel enters match scores manually (no oracle)
- Single tournament, single season
- No mobile app, web only
- Signer key is single point of trust
- Prizes are mock/representative, not real partnerships

---

## v1.5 — Post-Hackathon Polish (1–2 weeks)

**Goal**: Harden the demo into something a real audience could play, still using testnet.

### Planned
- [ ] Captain / vice-captain multipliers (×2 / ×1.5)
- [ ] Proper team role constraints (min WK, min bowlers, max per franchise)
- [ ] Tournament lifecycle UI (open → active → closed → archived)
- [ ] Email or push notifications when a user enters a new tier band
- [ ] Shareable team URLs for social
- [ ] Rate limiting on all public endpoints
- [ ] Proper error UX for wallet rejections, tx failures, wrong network
- [ ] Mobile-responsive layout pass
- [ ] Accessibility audit (keyboard nav, screen reader labels, contrast)
- [ ] Admin activity log (who submitted what match, when)
- [ ] Comprehensive contract test coverage ≥95%
- [ ] Slither + solhint in CI, passing zero findings
- [ ] Prize fulfillment webhook to a mock shipping service

---

## v2 — Real Product (1–3 months post-hackathon, if continuing)

**Goal**: Launch for a real PSL tournament with real prizes, real partnerships, and significantly reduced trust assumptions.

### Contracts
- [ ] **Upgradable signer** via admin multisig (for operational safety against key compromise)
- [ ] **Admin-updatable `MIN_EARNED_TO_CLAIM`** to allow tuning between tournaments
- [ ] **Emergency pause** on sync/claim via `Pausable` (triggered by multisig)
- [ ] **Merkle commitment system**: backend publishes a Merkle root of all points after each match; users can include a proof when syncing to cryptographically verify their entitlement
- [ ] **Multi-tournament support** via tournament ID field in vouchers and trophies
- [ ] **Trophy metadata improvements**: on-chain SVG with player names, match count, rank, earned amount
- [ ] **Audit** by a third-party firm (e.g. Zellic, Spearbit, Code4rena)

### Oracle & Data
- [ ] **Chainlink Functions** integration for pulling PSL stats from an official API
- [ ] **Redundant data sources** (Cricbuzz + ESPNCricinfo + official) with majority voting
- [ ] **Live scoring**: update points near-real-time during matches instead of batch after full match
- [ ] **Player form dynamics**: adjust base prices between matchdays based on recent performance

### Platform
- [ ] **Mobile web optimization** + PWA
- [ ] **Native mobile app** (React Native or Flutter) for wider reach
- [ ] **Localized UI** (Urdu support)
- [ ] **Social features**: friend leaderboards, private leagues, share-to-WhatsApp
- [ ] **Onboarding walkthrough** for users new to crypto wallets

### Partnerships
- [ ] **PSL franchise partnerships** for real merch, signed gear, tickets
- [ ] **PCB engagement** (if possible) for official endorsement
- [ ] **Brand sponsorships** for prize pool expansion
- [ ] **Broadcaster partnership** for TV/stream callouts during matches

### Governance & Community
- [ ] **Public proposal forum** for rule changes (Discord / forum)
- [ ] **Opt-in email list** for tournament announcements
- [ ] **Creator program**: top analysts can publish team picks that others can follow

### Security
- [ ] **Formal verification** of `PSLPoints.claimTier()` and `earnedBalance` invariants
- [ ] **Bug bounty program** via Immunefi or similar
- [ ] **Multi-sig admin** via Safe
- [ ] **HSM-backed signer** instead of env var key
- [ ] **Incident response playbook** with on-call rotation

### Tokenomics Evolution
- [ ] **Decision**: what to do with residual BNDY after tournaments? Options:
  - Reset `earnedBalance` between tournaments, keep wallet balances
  - Migrate to a new `BNDY-v2` contract each season
  - Allow burning residual BNDY for a small "fan token" airdrop
- [ ] **Cross-tournament reputation NFT**: a single, permanent "BoundaryLine Legacy" NFT per wallet that accumulates trophy references over seasons

---

## v3 — Platform (6+ months)

**Goal**: BoundaryLine is no longer just PSL. It's a framework for on-chain fantasy leagues across sports.

### Ideas
- [ ] **Multi-sport support**: cricket (PSL, BPL, IPL, Big Bash), football (PSL, Pakistan national), etc.
- [ ] **Tournament templates**: creators can launch their own fantasy contests with custom rules
- [ ] **WireFluid-native asset compositions**: use IBC to bring assets from other Cosmos chains as prizes
- [ ] **DAO governance**: token holders vote on rule changes, prize pools, supported tournaments
- [ ] **Revenue model**: small fee on transferable token movements (opt-in), sponsorship slots, premium features

### Stretch: cross-chain prize redemption
- Via IBC, allow a BoundaryLine winner on WireFluid to redeem their trophy for native assets on another Cosmos chain (e.g. Osmosis liquidity position, ATOM staking rewards, Stargaze NFTs)
- This is the moonshot version that truly leverages WireFluid's unique capabilities

---

## What We Will NOT Build

Important to name explicitly so we don't drift:

- ❌ **A speculative token market**. BNDY's tradability is incidental, not the point. We won't add a built-in DEX, liquidity mining, yield farming, or staking-for-returns mechanics.
- ❌ **Paid entry / pay-to-play**. Ever. This is non-negotiable. Free or nothing.
- ❌ **Gacha / loot box mechanics**. BoundaryLine is a skill game with earned rewards, not a gambling product.
- ❌ **Multi-chain expansion** (Ethereum mainnet, Polygon, Arbitrum). We are a WireFluid-native product. Going multi-chain adds complexity for zero upside.
- ❌ **Fiat on-ramps**. Users bring their own WireFluid wallet + gas. We don't handle money.
- ❌ **Complex financial derivatives**. No options on players, no prediction markets on match outcomes, no leveraged positions.

---

## Guiding Principles Through Roadmap

1. **Trust minimization over convenience** — every v2 item should reduce what users must trust us for
2. **Game integrity over token economics** — if a proposed feature makes BNDY more "interesting" but weakens the earned-vs-held distinction, we reject it
3. **Cricket-first, crypto-second** — the product is fantasy cricket. Crypto is the substrate, not the pitch.
4. **Free to play, gas-only** — this is a promise, not a phase
5. **Ship small, ship often** — each release should be demoable within a week of starting
