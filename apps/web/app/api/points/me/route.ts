import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { formatUnits } from "viem";
import {
  claim,
  getActiveTournamentId,
  userPoint,
} from "@boundaryline/db";
import {
  BNDY_DECIMALS,
  MIN_EARNED_TO_CLAIM_WEI,
  TIERS,
  tierForRank,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";
import { readEarnedBalance, readWalletBalance } from "@/lib/viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const [pointRow] = await database
      .select({ totalPoints: userPoint.totalPoints })
      .from(userPoint)
      .where(
        and(
          eq(userPoint.wallet, wallet),
          eq(userPoint.tournamentId, tournamentId),
        ),
      )
      .limit(1);

    const totalEarnedPoints = pointRow?.totalPoints ?? 0n;

    const [onChainEarned, walletBalance] = await Promise.all([
      readEarnedBalance(wallet as Address),
      readWalletBalance(wallet as Address),
    ]);

    // Off-chain points are integers; on-chain earned is 18-decimals BNDY.
    // 1 point == 1 BNDY (10^18 wei).
    const totalEarnedWei = totalEarnedPoints * 10n ** BigInt(BNDY_DECIMALS);
    const unsyncedWei =
      totalEarnedWei > onChainEarned ? totalEarnedWei - onChainEarned : 0n;

    const [rankRow] = await database
      .select({
        rank: sql<number>`(
          SELECT COUNT(*)::int + 1 FROM ${userPoint} up2
          WHERE up2.tournament_id = ${tournamentId}
            AND up2.total_points > ${userPoint.totalPoints}
        )`.as("rank"),
      })
      .from(userPoint)
      .where(
        and(
          eq(userPoint.wallet, wallet),
          eq(userPoint.tournamentId, tournamentId),
        ),
      )
      .limit(1);

    const [totalRow] = await database
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(userPoint)
      .where(
        and(
          eq(userPoint.tournamentId, tournamentId),
          gt(userPoint.totalPoints, 0n),
        ),
      );

    const globalRank = rankRow?.rank ?? null;
    const globalTotal = totalRow?.count ?? 0;

    const qualified = onChainEarned >= MIN_EARNED_TO_CLAIM_WEI;
    const tier = globalRank != null ? tierForRank(globalRank) : null;

    const [existingClaim] = await database
      .select({ id: claim.id })
      .from(claim)
      .where(
        and(
          eq(claim.wallet, wallet),
          eq(claim.tournamentId, tournamentId),
          sql`${claim.status} IN ('pending', 'confirmed')`,
        ),
      )
      .limit(1);

    const canClaim =
      qualified && tier != null && !existingClaim;

    return NextResponse.json({
      wallet,
      totalEarned: Number(totalEarnedPoints),
      onChainEarned: onChainEarned.toString(),
      walletBalance: walletBalance.toString(),
      unsynced: Number(formatUnits(unsyncedWei, BNDY_DECIMALS).split(".")[0]),
      globalRank,
      globalTotal,
      prizeRank: null,
      prizeTotal: 0,
      currentTierBand: tier?.name ?? null,
      canClaim,
      tiers: TIERS.map((t) => ({
        id: t.id,
        name: t.name,
        rankRequired: t.rankRequired,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load points: ${msg}`);
  }
}
