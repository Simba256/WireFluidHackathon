import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { WIREFLUID_RPC_URL, wirefluidTestnet } from "@boundaryline/shared";

export const wagmiConfig = createConfig({
  chains: [wirefluidTestnet],
  connectors: [injected({ shimDisconnect: true })],
  ssr: true,
  transports: {
    [wirefluidTestnet.id]: http(WIREFLUID_RPC_URL),
  },
});
