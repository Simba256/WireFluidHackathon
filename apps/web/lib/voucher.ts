import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import {
  CLAIM_VOUCHER_TYPES,
  CONTRACT_ADDRESSES,
  SYNC_VOUCHER_TYPES,
  buildEip712Domain,
  type ClaimVoucher,
  type SyncVoucher,
} from "@boundaryline/shared";
import { serverEnv } from "./env";

function signer() {
  const pk = serverEnv().SIGNER_PRIVATE_KEY as Hex;
  return privateKeyToAccount(pk);
}

export function generateNonce(): bigint {
  const hi = BigInt(Date.now());
  const lo = BigInt(Math.floor(Math.random() * 2 ** 32));
  return (hi << 32n) | lo;
}

export async function signSyncVoucher(voucher: SyncVoucher): Promise<Hex> {
  return signer().signTypedData({
    domain: buildEip712Domain(CONTRACT_ADDRESSES.PSLPoints as Address),
    types: SYNC_VOUCHER_TYPES,
    primaryType: "SyncVoucher",
    message: voucher,
  });
}

export async function signClaimVoucher(voucher: ClaimVoucher): Promise<Hex> {
  return signer().signTypedData({
    domain: buildEip712Domain(CONTRACT_ADDRESSES.PSLPoints as Address),
    types: CLAIM_VOUCHER_TYPES,
    primaryType: "ClaimVoucher",
    message: {
      user: voucher.user,
      tierId: BigInt(voucher.tierId),
      nonce: voucher.nonce,
    },
  });
}
