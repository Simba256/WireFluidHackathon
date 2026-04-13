import { createPublicClient, http, type Address, type PublicClient } from "viem";
import {
  CONTRACT_ADDRESSES,
  PSLPointsAbi,
  PSLTrophiesAbi,
  wirefluidTestnet,
} from "@boundaryline/shared";

let _client: PublicClient | undefined;

export function publicClient(): PublicClient {
  if (_client) return _client;
  _client = createPublicClient({
    chain: wirefluidTestnet,
    transport: http(),
  });
  return _client;
}

export async function readEarnedBalance(wallet: Address): Promise<bigint> {
  return (await publicClient().readContract({
    address: CONTRACT_ADDRESSES.PSLPoints,
    abi: PSLPointsAbi,
    functionName: "earnedBalance",
    args: [wallet],
  })) as bigint;
}

export async function readWalletBalance(wallet: Address): Promise<bigint> {
  return (await publicClient().readContract({
    address: CONTRACT_ADDRESSES.PSLPoints,
    abi: PSLPointsAbi,
    functionName: "balanceOf",
    args: [wallet],
  })) as bigint;
}

export async function readTrophyBalance(wallet: Address): Promise<bigint> {
  return (await publicClient().readContract({
    address: CONTRACT_ADDRESSES.PSLTrophies,
    abi: PSLTrophiesAbi,
    functionName: "balanceOf",
    args: [wallet],
  })) as bigint;
}
