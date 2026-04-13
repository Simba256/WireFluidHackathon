# WireFluid Platform Reference

> How BoundaryLine uses WireFluid, and why it's the right chain for this product.

---

## About WireFluid

**WireFluid** is a high-performance blockchain that combines the **Ethereum Virtual Machine (EVM)** with the **CometBFT consensus engine**, built on the **Cosmos SDK**. It's positioned as "a unified execution layer that solves the fragmentation of modern DeFi" — EVM developer ergonomics plus Cosmos-native interoperability.

### Key properties used by BoundaryLine

| Property | Value | Why it matters for us |
|---|---|---|
| **Finality** | ~5 seconds, economic (no rollbacks) | Users see their sync & claim txs confirm near-instantly — critical for the claim UX |
| **Throughput** | ~1,000 TPS | Tournament finale won't bottleneck if hundreds of players claim at once |
| **Gas fees** | Stable, low (~$0.0005 per sync, ~$0.001 per claim) | Gas-only cost model is viable — users don't balk at claiming |
| **EVM compatibility** | Full (Solidity, MetaMask, Hardhat, Foundry, ethers/viem) | Zero code changes required — our contracts are standard OZ ERC-20/ERC-721 |
| **IBC (Cosmos)** | 50+ app-chains, trustless bridges | Unlocks v2 cross-chain prize redemption story |
| **Consensus** | CometBFT (PoS BFT) | Instant finality; no "wait 12 blocks" UX |

---

## Network Configuration

### Testnet (what we use for the hackathon)

| Parameter | Value |
|---|---|
| **Network name** | WireFluid Testnet |
| **Chain ID** | `92533` |
| **RPC URL** | `https://evm.wirefluid.com` |
| **Currency symbol** | `WIRE` |
| **Block explorer** | `https://wirefluidscan.com` |
| **Faucet** | `https://faucet.wirefluid.com` |
| **Block time** | ~5 seconds |

### Adding to MetaMask

Users can add WireFluid manually:
1. MetaMask → Networks → **Add a network manually**
2. Paste the values above
3. Save

BoundaryLine's frontend also offers a **"Switch to WireFluid"** button via `wagmi.switchChain()`, which prompts MetaMask to add the network automatically if it's missing.

### Funding a Wallet

1. Visit `https://faucet.wirefluid.com`
2. Paste the wallet address
3. Receive free testnet WIRE (rate-limited per address)

Users need WIRE for:
- Syncing earned points on-chain (~$0.0005 gas)
- Claiming a prize tier (~$0.001 gas)
- Optionally transferring BNDY to another wallet

The faucet drip is more than enough for a full tournament's worth of activity.

---

## Hardhat Configuration

Our `packages/contracts/hardhat.config.ts` will register WireFluid Testnet as:

```ts
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    wirefluidTestnet: {
      url: "https://evm.wirefluid.com",
      chainId: 92533,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    // WireFluid uses its own explorer; override with wirefluidscan API if available
    apiKey: {
      wirefluidTestnet: process.env.WIREFLUIDSCAN_API_KEY ?? "",
    },
    customChains: [
      {
        network: "wirefluidTestnet",
        chainId: 92533,
        urls: {
          apiURL: "https://wirefluidscan.com/api",
          browserURL: "https://wirefluidscan.com",
        },
      },
    ],
  },
};

export default config;
```

Deploy with `pnpm deploy:testnet` — runs `hardhat run scripts/deploy.ts --network wirefluidTestnet`.

**Verification**: confirm availability of contract verification on `wirefluidscan.com`. If unavailable at demo time, we link to the address page directly instead of the verified-source view.

---

## viem & wagmi Chain Config

In `packages/shared/src/chain/wirefluid.ts`:

```ts
import { defineChain } from "viem";

export const wirefluidTestnet = defineChain({
  id: 92533,
  name: "WireFluid Testnet",
  nativeCurrency: { name: "WireFluid", symbol: "WIRE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evm.wirefluid.com"] },
  },
  blockExplorers: {
    default: { name: "WireFluidScan", url: "https://wirefluidscan.com" },
  },
  testnet: true,
});
```

Consumed by `apps/web/lib/wagmi.ts`:

```ts
import { createConfig, http } from "wagmi";
import { wirefluidTestnet } from "@boundaryline/shared/chain/wirefluid";

export const wagmiConfig = createConfig({
  chains: [wirefluidTestnet],
  transports: {
    [wirefluidTestnet.id]: http("https://evm.wirefluid.com"),
  },
});
```

All wallet interactions, contract reads, and tx sends are scoped to chain ID `92533`. If a user's wallet is on a different network, the UI shows a **"Wrong network — switch to WireFluid"** banner and disables actions until they switch.

---

## Why WireFluid For BoundaryLine Specifically

We considered Ethereum mainnet, Polygon, Arbitrum, Base, and WireFluid. WireFluid wins for our use case on three axes:

### 1. Finality speed matters for the claim UX
Our most dramatic moment is when a player clicks **"Claim Top 10 Prize"**. On a legacy EVM chain with 12-block finality, that's 2–3 minutes of uncertainty. On WireFluid it's **5 seconds** — the user sees their trophy NFT appear in their wallet while they're still watching the success screen. That compression from minutes to seconds is the difference between "blockchain feels slow" and "blockchain feels magical".

### 2. Stable low gas fees make free-to-play viable
Our tokenomics promise "free to play, pay only for gas you choose to spend". That only holds if gas is actually cheap. WireFluid's ~$0.001 claim cost means users feel zero friction. The same claim on Ethereum mainnet could cost $5–50 depending on congestion — completely incompatible with our model.

### 3. EVM compatibility means zero tooling lock-in
We write standard Solidity (0.8.24 with OpenZeppelin v5), deploy with Hardhat, test with Chai, build UIs with wagmi + viem. If WireFluid didn't exist tomorrow, we could redeploy to any EVM chain without changing a line of contract code. Using WireFluid is a **preference**, not a dependency — which is how we'd want to use any chain.

### 4. IBC is a genuine v2 story (not marketing)
WireFluid's Cosmos SDK foundation gives us IBC access to 50+ app-chains out of the box. That's a real future path for BoundaryLine: by v2/v3 we could let a winner redeem their trophy for native assets on another Cosmos chain (Osmosis, Stargaze, Noble) — something you physically cannot do from a non-IBC EVM chain without custom bridging infrastructure.

See [`ROADMAP.md`](./ROADMAP.md) for the full v3 cross-chain vision.

---

## What We DON'T Use From WireFluid (yet)

Being honest about scope:

- ❌ **IBC transfers** — v1 is WireFluid-only; no cross-chain assets
- ❌ **Cosmos modules** — we stay pure EVM; no `x/bank`, `x/staking`, `x/gov` custom hooks
- ❌ **Precompiles** — we don't use any WireFluid-specific precompiled contracts
- ❌ **Validator integration** — we're not running a validator or staking WIRE

All of these are candidates for v2. For the hackathon, we use WireFluid as a **fast, cheap, EVM-native chain** — which is the subset of its capabilities that most directly serves our MVP.

---

## Contract Addresses (updated after deploy)

| Contract | Address | Explorer |
|---|---|---|
| `PSLPoints` | `0x...` (TBD) | `https://wirefluidscan.com/address/0x...` |
| `PSLTrophies` | `0x...` (TBD) | `https://wirefluidscan.com/address/0x...` |

These will be committed to `packages/contracts/deployments/wirefluid-testnet.json` and mirrored in the root `.env.local` / Vercel env vars as `NEXT_PUBLIC_PSL_POINTS_ADDRESS` and `NEXT_PUBLIC_PSL_TROPHIES_ADDRESS`.

---

## Troubleshooting

### "Transaction underpriced" or "nonce too low"
WireFluid's 5-second blocks can surface nonce races if you submit multiple txs from the same wallet in quick succession. Clear MetaMask's activity tab (Settings → Advanced → Clear activity tab data) and retry.

### RPC timeout
`https://evm.wirefluid.com` occasionally hiccups on the testnet. Our frontend uses viem's built-in retry (3 attempts with exponential backoff). If persistent, check https://wirefluidscan.com for network status.

### Faucet rate limit
The faucet limits per-address claims. If you hit the limit, wait the cooldown window or use a fresh wallet. Do not spam — rate limiting protects everyone.

### Gas estimation failure
If a tx simulation fails with a revert, it's almost always a contract-level issue (e.g. below `MIN_EARNED_TO_CLAIM`, tier not matching, voucher expired), not a network issue. Check the error message — the contract emits descriptive require strings.

### Explorer shows pending forever
5s finality means pending should resolve within 10s. If a tx stays pending, it likely didn't broadcast — check MetaMask's activity tab for a "failed" or "dropped" state and retry.

---

## Official Links

- **Docs**: https://docs.wirefluid.com
- **Explorer**: https://wirefluidscan.com
- **Faucet**: https://faucet.wirefluid.com
- **RPC**: https://evm.wirefluid.com
