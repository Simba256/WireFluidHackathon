import { z } from "zod";

const WALLET_REGEX = /^0x[a-f0-9]{40}$/;

export const isWalletAddress = (value: string): boolean =>
  WALLET_REGEX.test(value);

export const normalizeWallet = (value: string): string => {
  const lower = value.toLowerCase();
  if (!WALLET_REGEX.test(lower)) {
    throw new Error(`Invalid wallet address: ${value}`);
  }
  return lower;
};

export const walletSchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .refine((v) => WALLET_REGEX.test(v), "Invalid wallet address");
