import { SiweMessage, generateNonce } from "siwe";
import { siweEnv } from "./env";

export function newNonce(): string {
  return generateNonce();
}

export interface VerifiedSiwe {
  address: string; // lowercase 0x...
  nonce: string;
}

export async function verifySiwe(
  message: string,
  signature: string,
  expectedDomain?: string,
): Promise<VerifiedSiwe> {
  const env = siweEnv();
  const siwe = new SiweMessage(message);
  const result = await siwe.verify({
    signature,
    domain: expectedDomain ?? env.SIWE_DOMAIN,
    nonce: siwe.nonce,
    time: new Date().toISOString(),
  });
  if (!result.success) {
    throw new Error(result.error?.type ?? "SIWE verification failed");
  }
  const chainIdExpected = Number(env.NEXT_PUBLIC_CHAIN_ID);
  if (siwe.chainId !== chainIdExpected) {
    throw new Error(
      `Wrong chain id: expected ${chainIdExpected}, got ${siwe.chainId}`,
    );
  }
  return {
    address: siwe.address.toLowerCase(),
    nonce: siwe.nonce,
  };
}
