import type { Address } from "viem";

export const CONTRACT_ADDRESSES = {
  PSLPoints: "0x785FAE9B7C7801173bc1Dc1e38A9ae827137abBc" as Address,
  PSLTrophies: "0x6F42EC722461Eb6fDe4B4cD8793b297eB34924F7" as Address,
} as const;

export const TRUSTED_SIGNER_ADDRESS =
  "0xeCBBF715d35FdD6f56316fb1B64B89C1B329aCd1" as Address;

export const INITIAL_TOURNAMENT_ID = 1 as const;
