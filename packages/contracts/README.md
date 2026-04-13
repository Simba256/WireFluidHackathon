# @boundaryline/contracts

Smart contracts for BoundaryLine.

## Contracts

- **`PSLPoints.sol`** — Transferable ERC-20 BNDY token with `earnedBalance` tracking, EIP-712 voucher-based mint, tier claim with minimum-earned gate.
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
