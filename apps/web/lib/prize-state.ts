import { and, eq, inArray, sql } from "drizzle-orm";
import {
  claim,
  getTierStockClaimed,
  syncedRecord,
  type Database,
} from "@boundaryline/db";
import {
  CONTRACT_ADDRESSES,
  MIN_EARNED_TO_CLAIM_WEI,
  PSLPointsAbi,
  tierForRank,
} from "@boundaryline/shared";
import type { Address, PublicClient } from "viem";
import { publicClient } from "@/lib/viem";

const CONTRACT_READ_BATCH_SIZE = 20;

export interface PrizeLeaderboardRow {
  wallet: string;
  walletBalance: bigint;
  earnedBalance: bigint;
  rank: number;
  canClaim: boolean;
  tier: ReturnType<typeof tierForRank>;
}

export interface PrizeLeaderboardState {
  entries: PrizeLeaderboardRow[];
  totalQualified: number;
  snapshotBlock: number;
  updatedAt: string;
}

export async function expireStaleClaims(
  database: Database,
  tournamentId: number,
  wallet?: string,
): Promise<void> {
  await database
    .update(claim)
    .set({ status: "expired" })
    .where(
      and(
        eq(claim.tournamentId, tournamentId),
        eq(claim.status, "pending"),
        sql`${claim.voucherExpiresAt} < now()`,
        wallet ? eq(claim.wallet, wallet) : undefined,
      ),
    );
}

export async function expireStaleSyncRecords(
  database: Database,
  tournamentId: number,
  wallet?: string,
): Promise<void> {
  await database
    .update(syncedRecord)
    .set({ status: "expired" })
    .where(
      and(
        eq(syncedRecord.tournamentId, tournamentId),
        eq(syncedRecord.status, "pending"),
        sql`${syncedRecord.voucherExpiresAt} < now()`,
        wallet ? eq(syncedRecord.wallet, wallet) : undefined,
      ),
    );
}

export async function getPendingSyncAmount(
  database: Database,
  wallet: string,
  tournamentId: number,
): Promise<bigint> {
  const [pendingSum] = await database
    .select({
      sum: sql<string>`COALESCE(SUM(${syncedRecord.amount}::numeric), 0)::text`,
    })
    .from(syncedRecord)
    .where(
      and(
        eq(syncedRecord.wallet, wallet),
        eq(syncedRecord.tournamentId, tournamentId),
        eq(syncedRecord.status, "pending"),
      ),
    );

  return BigInt(pendingSum?.sum ?? "0");
}

async function getTrackedWallets(
  database: Database,
  tournamentId: number,
  includeWallets: string[] = [],
): Promise<Address[]> {
  const rows = await database
    .selectDistinct({ wallet: syncedRecord.wallet })
    .from(syncedRecord)
    .where(eq(syncedRecord.tournamentId, tournamentId));

  const walletSet = new Set<string>(rows.map((row) => row.wallet));
  for (const wallet of includeWallets) {
    walletSet.add(wallet.toLowerCase());
  }

  return Array.from(walletSet) as Address[];
}

async function readWalletPointState(
  client: PublicClient,
  wallets: Address[],
): Promise<
  Array<{
    wallet: Address;
    walletBalance: bigint;
    earnedBalance: bigint;
  }>
> {
  const rows: Array<{
    wallet: Address;
    walletBalance: bigint;
    earnedBalance: bigint;
  }> = [];

  for (
    let start = 0;
    start < wallets.length;
    start += CONTRACT_READ_BATCH_SIZE
  ) {
    const batch = wallets.slice(start, start + CONTRACT_READ_BATCH_SIZE);
    const batchRows = await Promise.all(
      batch.map(async (wallet) => {
        const [walletBalance, earnedBalance] = await Promise.all([
          client
            .readContract({
              address: CONTRACT_ADDRESSES.PSLPoints,
              abi: PSLPointsAbi,
              functionName: "balanceOf",
              args: [wallet],
            })
            .then((result) => result as bigint)
            .catch(() => 0n),
          client
            .readContract({
              address: CONTRACT_ADDRESSES.PSLPoints,
              abi: PSLPointsAbi,
              functionName: "earnedBalance",
              args: [wallet],
            })
            .then((result) => result as bigint)
            .catch(() => 0n),
        ]);

        return {
          wallet,
          walletBalance,
          earnedBalance,
        };
      }),
    );

    rows.push(...batchRows);
  }

  return rows;
}

export async function getPrizeLeaderboardState(
  database: Database,
  tournamentId: number,
  includeWallets: string[] = [],
): Promise<PrizeLeaderboardState> {
  await expireStaleClaims(database, tournamentId);

  const wallets = await getTrackedWallets(
    database,
    tournamentId,
    includeWallets,
  );
  const updatedAt = new Date().toISOString();
  if (wallets.length === 0) {
    return {
      entries: [],
      totalQualified: 0,
      snapshotBlock: 0,
      updatedAt,
    };
  }

  const client = publicClient();
  const [block, walletStates, stockClaimed, activeClaims] = await Promise.all([
    client.getBlockNumber(),
    readWalletPointState(client, wallets),
    getTierStockClaimed(database, tournamentId),
    database
      .select({ wallet: claim.wallet })
      .from(claim)
      .where(
        and(
          eq(claim.tournamentId, tournamentId),
          inArray(claim.status, ["pending", "confirmed"]),
        ),
      ),
  ]);

  const claimedByTier = new Map<number, number>(
    stockClaimed.map((row) => [row.tierId, row.claimed]),
  );
  const activeClaimWallets = new Set(activeClaims.map((row) => row.wallet));

  const qualified = walletStates
    .filter((row) => row.earnedBalance >= MIN_EARNED_TO_CLAIM_WEI)
    .sort((a, b) => {
      if (a.walletBalance === b.walletBalance) {
        return a.wallet.localeCompare(b.wallet);
      }

      return b.walletBalance > a.walletBalance ? 1 : -1;
    });

  const entries = qualified.map((row, index) => {
    const rank = index + 1;
    const tier = tierForRank(rank);
    const canClaim =
      tier != null &&
      !activeClaimWallets.has(row.wallet) &&
      (claimedByTier.get(tier.id) ?? 0) < tier.stockLimit;

    return {
      wallet: row.wallet,
      walletBalance: row.walletBalance,
      earnedBalance: row.earnedBalance,
      rank,
      canClaim,
      tier,
    };
  });

  return {
    entries,
    totalQualified: entries.length,
    snapshotBlock: Number(block),
    updatedAt,
  };
}

export function getPrizeStandingForWallet(
  state: PrizeLeaderboardState,
  wallet: string,
): PrizeLeaderboardRow | null {
  return (
    state.entries.find(
      (entry) => entry.wallet.toLowerCase() === wallet.toLowerCase(),
    ) ?? null
  );
}

export function rankPercentile(
  rank: number | null,
  total: number,
): number | null {
  if (rank == null || total <= 0) {
    return null;
  }

  return Math.max(1, Math.round(((total - rank + 1) / total) * 100));
}

export function qualificationProgressPercent(earnedBalance: bigint): number {
  const bounded =
    earnedBalance >= MIN_EARNED_TO_CLAIM_WEI
      ? MIN_EARNED_TO_CLAIM_WEI
      : earnedBalance;
  return Number((bounded * 100n) / MIN_EARNED_TO_CLAIM_WEI);
}
