import { defineChain } from "viem";

export const WIREFLUID_CHAIN_ID = 92533 as const;
export const WIREFLUID_RPC_URL = "https://evm.wirefluid.com" as const;
export const WIREFLUID_EXPLORER_URL = "https://wirefluidscan.com" as const;
export const WIREFLUID_FAUCET_URL = "https://faucet.wirefluid.com" as const;

export const wirefluidTestnet = defineChain({
  id: WIREFLUID_CHAIN_ID,
  name: "WireFluid Testnet",
  nativeCurrency: { name: "WireFluid", symbol: "WIRE", decimals: 18 },
  rpcUrls: {
    default: { http: [WIREFLUID_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "WireFluidScan", url: WIREFLUID_EXPLORER_URL },
  },
  testnet: true,
});

export const explorerTxUrl = (txHash: string): string =>
  `${WIREFLUID_EXPLORER_URL}/tx/${txHash}`;

export const explorerAddressUrl = (address: string): string =>
  `${WIREFLUID_EXPLORER_URL}/address/${address}`;

export const explorerTokenUrl = (
  contract: string,
  tokenId: string | number,
): string => `${WIREFLUID_EXPLORER_URL}/token/${contract}?a=${tokenId}`;
