import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { claim, getActiveTournamentId, userPoint } from "@boundaryline/db";
import { BNDY_DECIMALS, TIERS } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";
import { readEarnedBalance, readWalletBalance } from "@/lib/viem";
import {
  expireStaleSyncRecords,
  getPendingSyncAmount,
  getPrizeLeaderboardState,
  getPrizeStandingForWallet,
} from "@/lib/prize-state";

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

    await expireStaleSyncRecords(database, tournamentId, wallet);

    const [onChainEarned, walletBalance, pendingWei, prizeState] =
      await Promise.all([
        readEarnedBalance(wallet as Address),
        readWalletBalance(wallet as Address),
        getPendingSyncAmount(database, wallet, tournamentId),
        getPrizeLeaderboardState(database, tournamentId, [wallet]),
      ]);

    const [claimedRow] = await database
      .select({
        total: sql<string>`COALESCE(SUM(${claim.earnedAtClaim}), 0)`.as("total"),
      })
      .from(claim)
      .where(
        and(
          eq(claim.wallet, wallet),
          eq(claim.tournamentId, tournamentId),
          eq(claim.status, "confirmed"),
        ),
      );
    const claimedEarnedWei = BigInt(claimedRow?.total ?? "0");

    // Off-chain points are integers; on-chain earned is 18-decimals BNDY.
    // 1 point == 1 BNDY (10^18 wei). Subtract prior claims so post-claim
    // dashboards don't re-show the burned delta as "unsynced".
    const totalEarnedWei = totalEarnedPoints * 10n ** BigInt(BNDY_DECIMALS);
    const consumedWei = onChainEarned + pendingWei + claimedEarnedWei;
    const unsyncedWei =
      totalEarnedWei > consumedWei ? totalEarnedWei - consumedWei : 0n;

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
    const prizeStanding = getPrizeStandingForWallet(prizeState, wallet);

    return NextResponse.json({
      wallet,
      totalEarned: Number(totalEarnedPoints),
      onChainEarned: onChainEarned.toString(),
      walletBalance: walletBalance.toString(),
      unsynced: Number(formatUnits(unsyncedWei, BNDY_DECIMALS).split(".")[0]),
      globalRank,
      globalTotal,
      prizeRank: prizeStanding?.rank ?? null,
      prizeTotal: prizeState.totalQualified,
      currentTierBand: prizeStanding?.tier?.name ?? null,
      canClaim: prizeStanding?.canClaim ?? false,
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
