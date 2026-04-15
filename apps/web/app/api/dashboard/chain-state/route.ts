import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { claim, getActiveTournamentId, userPoint } from "@boundaryline/db";
import {
  BNDY_DECIMALS,
  type DashboardChainStateDTO,
} from "@boundaryline/shared";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";
import {
  expireStaleClaims,
  expireStaleSyncRecords,
  getPendingSyncAmount,
  getPrizeLeaderboardState,
  getPrizeStandingForWallet,
  qualificationProgressPercent,
  rankPercentile,
} from "@/lib/prize-state";
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

    await Promise.all([
      expireStaleClaims(database, tournamentId, wallet),
      expireStaleSyncRecords(database, tournamentId, wallet),
    ]);

    const [
      pointRow,
      onChainEarned,
      walletBalance,
      pendingSync,
      prizeState,
      claimedRow,
    ] = await Promise.all([
      database
        .select({ totalPoints: userPoint.totalPoints })
        .from(userPoint)
        .where(
          and(
            eq(userPoint.wallet, wallet),
            eq(userPoint.tournamentId, tournamentId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
      readEarnedBalance(wallet as Address),
      readWalletBalance(wallet as Address),
      getPendingSyncAmount(database, wallet, tournamentId),
      getPrizeLeaderboardState(database, tournamentId, [wallet]),
      database
        .select({
          total: sql<string>`COALESCE(SUM(${claim.earnedAtClaim}), 0)`.as(
            "total",
          ),
        })
        .from(claim)
        .where(
          and(
            eq(claim.wallet, wallet),
            eq(claim.tournamentId, tournamentId),
            eq(claim.status, "confirmed"),
          ),
        )
        .then((rows) => rows[0]),
    ]);

    const totalEarnedPoints = pointRow?.totalPoints ?? 0n;
    const totalEarnedWei = totalEarnedPoints * 10n ** BigInt(BNDY_DECIMALS);
    const claimedEarnedWei = BigInt(claimedRow?.total ?? "0");
    const consumedWei = onChainEarned + pendingSync + claimedEarnedWei;
    const unsyncedWei =
      totalEarnedWei > consumedWei ? totalEarnedWei - consumedWei : 0n;

    const prizeStanding = getPrizeStandingForWallet(prizeState, wallet);
    const prizeRank = prizeStanding?.rank ?? null;
    const prizePercentile = rankPercentile(
      prizeRank,
      prizeState.totalQualified,
    );
    const qualified = prizeStanding != null;
    const progressPercent = qualified
      ? (prizePercentile ?? 100)
      : qualificationProgressPercent(onChainEarned);
    const progressLabel = qualified
      ? "Standing Across Qualified Wallets"
      : "Progress to Qualification";

    return NextResponse.json({
      balances: {
        onChainEarned: onChainEarned.toString(),
        walletBalance: walletBalance.toString(),
        unsynced: Number(formatUnits(unsyncedWei, BNDY_DECIMALS).split(".")[0]),
      },
      prize: {
        qualified,
        prizeRank,
        prizeTotal: prizeState.totalQualified,
        percentile: prizePercentile,
        currentTier: prizeStanding?.tier
          ? {
              id: prizeStanding.tier.id,
              name: prizeStanding.tier.name,
              displayName: prizeStanding.tier.displayName,
              rankRequired: prizeStanding.tier.rankRequired,
            }
          : null,
        canClaim: prizeStanding?.canClaim ?? false,
        progressLabel,
        progressPercent,
      },
    } satisfies DashboardChainStateDTO);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load dashboard chain state: ${msg}`);
  }
}
