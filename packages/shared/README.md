# @boundaryline/shared

Cross-workspace shared code — chain config, ABIs, TypeScript types, constants.

## Layout

```
src/
├── index.ts         Barrel re-export
├── abis/            Contract ABIs (copied from packages/contracts after build)
├── types/           Shared TypeScript types (User, Team, Tier, Voucher, etc.)
├── chain/           WireFluid network config, addresses, tier definitions
└── constants/       MIN_EARNED_TO_CLAIM, tier rank thresholds, tier IDs
```

Consumed by `@boundaryline/web` and `@boundaryline/db` — keeps the source of truth in one place.
