# Smart Contracts

> Specifications for `PSLPoints.sol` and `PSLTrophies.sol` — the on-chain surface of BoundaryLine.

---

## Overview

Two contracts, deployed to WireFluid testnet (chain ID `92533`):

1. **`PSLPoints`** — ERC-20 `BNDY` token. Transferable. Tracks `earnedBalance` separately from `balanceOf`. Enforces minimum-earned threshold for prize claims.
2. **`PSLTrophies`** — Soulbound ERC-721. Minted exclusively by `PSLPoints.claimTier()`. Represents proof of tournament victory.

Solidity version: `0.8.24`. Compiler optimizer: `200 runs`.

Dependencies: OpenZeppelin Contracts v5 (`ERC20`, `ERC721`, `ECDSA`, `EIP712`, `AccessControl`).

---

## `PSLPoints.sol`

### Purpose
The BNDY token used throughout BoundaryLine. Users earn off-chain points by playing, then sync those points to their wallet as transferable ERC-20 tokens. To claim a prize, users must have **earned** (not merely received via transfer) a minimum threshold, and hold at least that much in their wallet for burning.

### State

| Variable | Type | Purpose |
|---|---|---|
| `earnedBalance` | `mapping(address => uint256)` | Cumulative tokens earned through gameplay. Increments on `sync()`, resets to 0 on `claimTier()`. **Never changes on ERC-20 transfers.** |
| `usedNonces` | `mapping(uint256 => bool)` | Replay protection for voucher nonces |
| `trustedSigner` | `address immutable` | The backend EOA authorized to sign sync & claim vouchers |
| `trophies` | `address` | Address of `PSLTrophies` contract (set once by admin) |
| `MIN_EARNED_TO_CLAIM` | `uint256 constant = 10_000 * 10**18` | Minimum `earnedBalance` required to claim any tier |

### Events

```solidity
event Synced(address indexed user, uint256 amount, uint256 newEarnedTotal, uint256 nonce);
event TierClaimed(address indexed user, uint8 indexed tierId, uint256 burnedAmount, uint256 trophyTokenId);
event TrophiesContractSet(address indexed trophies);
```

### External Functions

#### `sync(uint256 amount, uint256 nonce, bytes calldata signature)`
Mints `amount` BNDY to `msg.sender` and increments their `earnedBalance` by `amount`. Requires a valid EIP-712 signature from `trustedSigner`.

**Validation**:
- `usedNonces[nonce] == false`
- Recovered signer from `(msg.sender, amount, nonce)` digest equals `trustedSigner`
- `amount > 0`

**Effects**:
- `usedNonces[nonce] = true`
- `_mint(msg.sender, amount)`
- `earnedBalance[msg.sender] += amount`
- Emit `Synced`

**Gas**: ~70,000

#### `claimTier(uint8 tierId, uint256 nonce, bytes calldata signature)`
Burns the caller's **entire BNDY balance** and mints a soulbound trophy NFT for the specified tier.

**Validation**:
- `earnedBalance[msg.sender] >= MIN_EARNED_TO_CLAIM`
- `usedNonces[nonce] == false`
- Recovered signer from `(msg.sender, tierId, nonce)` digest equals `trustedSigner`
- `balanceOf(msg.sender) > 0`

**Effects**:
- `usedNonces[nonce] = true`
- Burn entire balance of `msg.sender`
- `earnedBalance[msg.sender] = 0`
- Call `PSLTrophies.mintTrophy(msg.sender, tierId)` → returns `tokenId`
- Emit `TierClaimed`

**Gas**: ~120,000 (includes cross-contract trophy mint)

#### `setTrophies(address _trophies)` — admin only, one-time
Sets the address of the `PSLTrophies` contract. Reverts if already set. Emits `TrophiesContractSet`.

### Inherited ERC-20 Behavior
`transfer`, `transferFrom`, `approve`, `allowance`, `balanceOf`, `totalSupply` — all standard OpenZeppelin ERC-20, no overrides. Fully transferable, DEX-compatible.

### EIP-712 Domain
```solidity
EIP712("BoundaryLine", "1")
// domainSeparator computed at construction
```

### Typed Data Structs
```solidity
struct SyncVoucher {
    address user;
    uint256 amount;
    uint256 nonce;
}
// typeHash: keccak256("SyncVoucher(address user,uint256 amount,uint256 nonce)")

struct ClaimVoucher {
    address user;
    uint8 tierId;
    uint256 nonce;
}
// typeHash: keccak256("ClaimVoucher(address user,uint8 tierId,uint256 nonce)")
```

### Security Considerations
- `earnedBalance` is monotonic (only increases via mint, resets only on claim). Transfers never touch it.
- `usedNonces` prevents voucher replay.
- Claim voucher is single-use because nonce is consumed.
- Signer key compromise = total mint authority. Mitigation: rotate signer via governance in v2.
- Re-entrancy: cross-call to `PSLTrophies.mintTrophy` is the last action in `claimTier`. Trophies contract is known/trusted. No CEI issues.
- Integer overflow: Solidity 0.8.x checked math.

---

## `PSLTrophies.sol`

### Purpose
Non-transferable ERC-721 NFTs representing tournament achievements. Minted only when a player successfully claims a prize tier. Once minted, they are permanently bound to the winner's wallet.

### State

| Variable | Type | Purpose |
|---|---|---|
| `minter` | `address immutable` | Address of `PSLPoints` contract (only caller allowed to mint) |
| `nextTokenId` | `uint256` | Auto-incrementing token ID |
| `tokenTier` | `mapping(uint256 => uint8)` | Tier ID per token (1=Top50, 2=Top25, 3=Top10, 4=Top3, 5=Rank1) |
| `tokenTournamentId` | `mapping(uint256 => uint256)` | Which tournament this trophy is from |
| `tierNames` | `mapping(uint8 => string)` | Human-readable tier labels (set by admin) |

### Events

```solidity
event TrophyMinted(
    address indexed winner,
    uint256 indexed tokenId,
    uint8 indexed tierId,
    uint256 tournamentId
);
```

### External Functions

#### `mintTrophy(address winner, uint8 tierId) external returns (uint256 tokenId)`
**Caller-restricted**: `msg.sender == minter`. Mints a new trophy NFT to `winner` with the specified tier.

**Effects**:
- `tokenId = ++nextTokenId`
- `_mint(winner, tokenId)`
- `tokenTier[tokenId] = tierId`
- `tokenTournamentId[tokenId] = currentTournamentId`
- Emit `TrophyMinted`

#### `tokenURI(uint256 tokenId) external view override returns (string memory)`
Returns a data URI with inline SVG + JSON metadata. Metadata includes:
- `name`: *"BoundaryLine Trophy — Top 10 Finisher"*
- `description`: *"Awarded to {winner} for finishing rank {rank} in PSL 2026 Tournament on BoundaryLine."*
- `image`: base64-encoded SVG displaying tier name, token ID, tournament name
- `attributes`: `[{tier, tournament, minted_at}]`

### Soulbound Enforcement
Override `_update` from OpenZeppelin ERC721 v5:

```solidity
function _update(address to, uint256 tokenId, address auth) 
    internal override returns (address) 
{
    address from = _ownerOf(tokenId);
    require(
        from == address(0) || to == address(0),
        "PSLTrophies: soulbound"
    );
    return super._update(to, tokenId, auth);
}
```

This blocks all transfers while allowing minting (`from == 0x0`) and burning (`to == 0x0`, not used in practice).

### Security Considerations
- Only `PSLPoints` can mint. Hardcoded `immutable` minter address set at construction.
- Cannot be transferred under any circumstance (soulbound).
- No admin burn — trophies are permanent.
- Metadata is self-contained (on-chain SVG), no IPFS dependency.

---

## Deployment Sequence

1. Deploy `PSLTrophies` with `minter = <future PSLPoints address>` — use `CREATE2` or pre-compute, or deploy a placeholder minter and set via admin function (simpler for hackathon: deploy Points first with placeholder trophies, deploy Trophies with Points address, then `PSLPoints.setTrophies(trophies)`).
2. Deploy `PSLPoints` with `trustedSigner = <backend EOA>`.
3. Deploy `PSLTrophies` with `minter = <PSLPoints address>`.
4. Call `PSLPoints.setTrophies(<PSLTrophies address>)`.
5. Verify both contracts on `wirefluidscan.com`.
6. Fund signer wallet with enough WIRE for a few test txs.

Deploy script: `packages/contracts/scripts/deploy.ts`. Artifacts and addresses written to `packages/contracts/deployments/wirefluid-testnet.json` and consumed by `packages/shared/chain.ts`.

---

## Testing Strategy

Hardhat + Chai. Target coverage: >90% on both contracts.

### `PSLPoints` test cases
- ✅ Sync mints correct amount and increments `earnedBalance`
- ✅ Sync rejects replayed nonce
- ✅ Sync rejects bad signature
- ✅ Sync rejects amount == 0
- ✅ Transfers move `balanceOf` but NOT `earnedBalance`
- ✅ Claim rejects if `earnedBalance < MIN_EARNED_TO_CLAIM`
- ✅ Claim rejects replayed nonce
- ✅ Claim rejects bad signature
- ✅ Claim burns entire balance (including gifted excess)
- ✅ Claim resets `earnedBalance` to 0
- ✅ Claim mints trophy via cross-call
- ✅ User cannot claim twice (earnedBalance gate after reset)
- ✅ `setTrophies` is one-shot

### `PSLTrophies` test cases
- ✅ Mint only by `minter`
- ✅ Trophies cannot be transferred (any transfer attempt reverts)
- ✅ `tokenURI` returns valid data URI
- ✅ Trophy metadata contains correct tier and tournament

### Static Analysis
- Slither — must pass with zero high/medium findings
- Solhint — style + best practices

---

## Gas Budget

| Operation | Estimated Gas | Cost on WireFluid @ avg |
|---|---|---|
| `sync()` | ~70,000 | ~$0.0005 |
| `claimTier()` | ~120,000 | ~$0.001 |
| `transfer()` | ~35,000 | ~$0.0002 |

Fluid, cheap. Not a UX concern.
