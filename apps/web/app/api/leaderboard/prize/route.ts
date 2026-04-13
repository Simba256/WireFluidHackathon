import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getActiveTournamentId, syncedRecord } from "@boundaryline/db";
import {
  CONTRACT_ADDRESSES,
  MIN_EARNED_TO_CLAIM_WEI,
  PSLPointsAbi,
  tierForRank,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";
import { publicClient } from "@/lib/viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazy read: fetch the distinct wallet set from synced_record (everyone who's
// ever touched sync is tracked), multicall balanceOf + earnedBalance, filter
// qualified, rank by balanceOf DESC. Full indexer-driven Transfer log scan is
// v2 (see BUILD_CHECKLIST §9).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const walletRows = await database
      .selectDistinct({ wallet: syncedRecord.wallet })
      .from(syncedRecord)
      .where(eq(syncedRecord.tournamentId, tournamentId));

    const wallets = walletRows.map((r) => r.wallet as Address);
    if (wallets.length === 0) {
      return NextResponse.json({
        entries: [],
        totalQualified: 0,
        snapshotBlock: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    const client = publicClient();
    const block = await client.getBlockNumber();

    const calls = wallets.flatMap((w) => [
      {
        address: CONTRACT_ADDRESSES.PSLPoints,
        abi: PSLPointsAbi,
        functionName: "balanceOf" as const,
        args: [w] as const,
      },
      {
        address: CONTRACT_ADDRESSES.PSLPoints,
        abi: PSLPointsAbi,
        functionName: "earnedBalance" as const,
        args: [w] as const,
      },
    ]);

    const results = await client.multicall({
      contracts: calls,
      allowFailure: true,
    });

    type Row = {
      wallet: Address;
      balance: bigint;
      earned: bigint;
    };
    const rows: Row[] = wallets.map((w, i) => {
      const bal = results[i * 2];
      const ern = results[i * 2 + 1];
      return {
        wallet: w,
        balance: bal?.status === "success" ? (bal.result as bigint) : 0n,
        earned: ern?.status === "success" ? (ern.result as bigint) : 0n,
      };
    });

    const qualified = rows
      .filter((r) => r.earned >= MIN_EARNED_TO_CLAIM_WEI)
      .sort((a, b) => (b.balance === a.balance ? 0 : b.balance > a.balance ? 1 : -1));

    const paged = qualified.slice(offset, offset + limit);
    const entries = paged.map((r, i) => {
      const rank = offset + i + 1;
      const tier = tierForRank(rank);
      return {
        rank,
        wallet: r.wallet,
        walletBalance: r.balance.toString(),
        earnedBalance: r.earned.toString(),
        tierEligible: tier?.name ?? null,
        canClaim: tier != null,
      };
    });

    return NextResponse.json({
      entries,
      totalQualified: qualified.length,
      snapshotBlock: Number(block),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load prize leaderboard: ${msg}`);
  }
}
