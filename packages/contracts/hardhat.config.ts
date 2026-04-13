import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const WIREFLUIDSCAN_API_KEY = process.env.WIREFLUIDSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: false,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    wirefluidTestnet: {
      url: process.env.WIREFLUID_RPC_URL ?? "https://evm.wirefluid.com",
      chainId: 92533,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      wirefluidTestnet: WIREFLUIDSCAN_API_KEY || "placeholder",
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
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  mocha: {
    timeout: 60_000,
  },
};

export default config;
