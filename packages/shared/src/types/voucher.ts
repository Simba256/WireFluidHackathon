import type { Address, Hex, TypedDataDomain } from "viem";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION } from "../constants";
import { CONTRACT_ADDRESSES, WIREFLUID_CHAIN_ID } from "../chain/index";

export interface SyncVoucher {
  user: Address;
  amount: bigint;
  nonce: bigint;
}

export interface ClaimVoucher {
  user: Address;
  tierId: number;
  nonce: bigint;
}

export const SYNC_VOUCHER_TYPES = {
  SyncVoucher: [
    { name: "user", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const CLAIM_VOUCHER_TYPES = {
  ClaimVoucher: [
    { name: "user", type: "address" },
    { name: "tierId", type: "uint8" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const buildEip712Domain = (
  verifyingContract: Address = CONTRACT_ADDRESSES.PSLPoints,
): TypedDataDomain => ({
  name: EIP712_DOMAIN_NAME,
  version: EIP712_DOMAIN_VERSION,
  chainId: WIREFLUID_CHAIN_ID,
  verifyingContract,
});

export interface SignedSyncVoucher {
  voucher: SyncVoucher;
  signature: Hex;
  expiresAt: string;
}

export interface SignedClaimVoucher {
  voucher: ClaimVoucher;
  signature: Hex;
  expiresAt: string;
}
