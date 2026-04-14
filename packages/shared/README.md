# @boundaryline/shared

Cross-workspace shared code — chain config, ABIs, TypeScript types, constants.

## Layout

```
src/
├── index.ts         Barrel re-export
├── abis/            PSLPoints + PSLTrophies ABIs (inlined `as const` for viem inference)
├── types/           Shared TypeScript types (DTOs, SyncVoucher, ClaimVoucher, ApiError)
├── chain/           WireFluid viem defineChain, explorer helpers, deployed contract addresses
├── constants.ts     TEAM_SIZE, MIN_EARNED_TO_CLAIM_WEI (the single 10k
│                    leaderboard + claim gate), point formula, tier definitions, EIP-712 domain
└── wallet.ts        Lowercase 0x... normalization + Zod schema
```

Consumed by `@boundaryline/web` and (optionally) `@boundaryline/db` — keeps the source of truth in one place.
