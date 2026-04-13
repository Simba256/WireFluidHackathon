import { ethers } from "hardhat";
import type { Signer, TypedDataDomain } from "ethers";

export const SYNC_TYPES = {
  SyncVoucher: [
    { name: "user", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const CLAIM_TYPES = {
  ClaimVoucher: [
    { name: "user", type: "address" },
    { name: "tierId", type: "uint8" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export async function domain(verifyingContract: string): Promise<TypedDataDomain> {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  return {
    name: "BoundaryLine",
    version: "1",
    chainId,
    verifyingContract,
  };
}

export async function signSync(
  signer: Signer,
  verifyingContract: string,
  user: string,
  amount: bigint,
  nonce: bigint,
): Promise<string> {
  const d = await domain(verifyingContract);
  return signer.signTypedData(d, SYNC_TYPES, { user, amount, nonce });
}

export async function signClaim(
  signer: Signer,
  verifyingContract: string,
  user: string,
  tierId: number,
  nonce: bigint,
): Promise<string> {
  const d = await domain(verifyingContract);
  return signer.signTypedData(d, CLAIM_TYPES, { user, tierId, nonce });
}

export const ONE_BNDY = 10n ** 18n;
export const MIN_EARNED = 10_000n * ONE_BNDY;
