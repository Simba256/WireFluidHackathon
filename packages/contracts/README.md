# @boundaryline/contracts

Smart contracts for BoundaryLine.

## Contracts

- **`PSLPoints.sol`** — Transferable ERC-20 BNDY token with `earnedBalance` tracking, EIP-712 voucher-based mint, tier claim gated by `earnedBalance >= 10,000 BNDY`. The same 10k threshold is mirrored in the backend leaderboard filter, so qualification and claim eligibility are the same set; trading and transfers move `balanceOf` (and therefore rank) but never `earnedBalance`.
- **`PSLTrophies.sol`** — Soulbound ERC-721 achievement NFTs, minted exclusively by `PSLPoints.claimTier()`.

See [`../../docs/CONTRACTS.md`](../../docs/CONTRACTS.md) for the full spec.

## Layout

```
contracts/
├── token/            PSLPoints.sol, PSLTrophies.sol
└── interfaces/       IPSLTrophies.sol
test/                 Hardhat + Chai tests
scripts/              deploy.ts
deployments/          Network addresses (committed)
```

## Deploy

```bash
cp .env.example .env
# fill in DEPLOYER_PRIVATE_KEY and SIGNER_ADDRESS
pnpm compile
pnpm test
pnpm deploy:testnet
```

Deployed addresses land in `deployments/wirefluid-testnet.json` — commit them.
