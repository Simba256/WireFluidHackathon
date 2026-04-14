import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Address } from "viem";
import { formatUnits } from "viem";
import {
  claim,
  getActiveTournamentId,
  match,
  playerScore,
  team,
  teamPlayer,
  tournament,
  user,
  userPoint,
} from "@boundaryline/db";
import {
  BNDY_DECIMALS,
  DASHBOARD_SEASON_LABEL,
  DASHBOARD_TOURNAMENT_SUBTITLE,
  DEFAULT_MANAGER_NAME,
  MIN_EARNED_TO_CLAIM_BNDY,
  TIERS_BY_ID,
  franchiseForName,
  type DashboardDTO,
  type TierId,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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

function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 5)}...${wallet.slice(-4)}`;
}

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

    const [tournamentRow] = await database
      .select({ id: tournament.id, name: tournament.name })
      .from(tournament)
      .where(eq(tournament.id, tournamentId))
      .limit(1);

    const [userRow] = await database
      .select({ username: user.username })
      .from(user)
      .where(eq(user.wallet, wallet))
      .limit(1);

    const [
      pointRow,
      rankRow,
      totalRow,
      teamRow,
      currentClaim,
      onChainEarned,
      walletBalance,
      pendingSync,
      prizeState,
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
      database
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
        .limit(1)
        .then((rows) => rows[0]),
      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userPoint)
        .where(
          and(
            eq(userPoint.tournamentId, tournamentId),
            gt(userPoint.totalPoints, 0n),
          ),
        )
        .then((rows) => rows[0]),
      database
        .select({ id: team.id })
        .from(team)
        .where(
          and(eq(team.userWallet, wallet), eq(team.tournamentId, tournamentId)),
        )
        .limit(1)
        .then((rows) => rows[0]),
      database
        .select()
        .from(claim)
        .where(
          and(
            eq(claim.wallet, wallet),
            eq(claim.tournamentId, tournamentId),
            sql`${claim.status} IN ('pending', 'confirmed')`,
          ),
        )
        .orderBy(desc(claim.createdAt))
        .limit(1)
        .then((rows) => rows[0]),
      readEarnedBalance(wallet as Address),
      readWalletBalance(wallet as Address),
      getPendingSyncAmount(database, wallet, tournamentId),
      getPrizeLeaderboardState(database, tournamentId, [wallet]),
    ]);

    const totalEarnedPoints = pointRow?.totalPoints ?? 0n;
    const totalEarnedWei = totalEarnedPoints * 10n ** BigInt(BNDY_DECIMALS);
    const unsyncedWei =
      totalEarnedWei > onChainEarned + pendingSync
        ? totalEarnedWei - onChainEarned - pendingSync
        : 0n;

    const prizeStanding = getPrizeStandingForWallet(prizeState, wallet);
    const globalRank = rankRow?.rank ?? null;
    const globalTotal = totalRow?.count ?? 0;
    const globalPercentile = rankPercentile(globalRank, globalTotal);
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

    let playerCount = 0;
    let recentMatches: DashboardDTO["recentMatches"] = [];
    let upcomingMatches: DashboardDTO["upcomingMatches"] = [];

    const upcomingRows = await database
      .select({
        id: match.id,
        status: match.status,
        teamA: match.teamA,
        teamB: match.teamB,
        venue: match.venue,
        scheduledAt: match.scheduledAt,
        playedAt: match.playedAt,
      })
      .from(match)
      .where(
        and(
          eq(match.tournamentId, tournamentId),
          inArray(match.status, ["scheduled", "live"]),
        ),
      )
      .orderBy(match.scheduledAt)
      .limit(4);

    upcomingMatches = upcomingRows.map((row) => {
      const teamA = franchiseForName(row.teamA);
      const teamB = franchiseForName(row.teamB);

      return {
        id: row.id,
        status: row.status as "scheduled" | "live",
        teamA: {
          name: row.teamA,
          shortCode: teamA.shortCode,
          accentColor: teamA.accentColor,
          logoPath: teamA.logoPath,
        },
        teamB: {
          name: row.teamB,
          shortCode: teamB.shortCode,
          accentColor: teamB.accentColor,
          logoPath: teamB.logoPath,
        },
        venue: row.venue,
        scheduledAt: row.scheduledAt.toISOString(),
        playedAt: row.playedAt?.toISOString() ?? null,
        points: null,
      };
    });

    if (teamRow) {
      const [playerCountRow, activityRows] = await Promise.all([
        database
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(teamPlayer)
          .where(eq(teamPlayer.teamId, teamRow.id))
          .then((rows) => rows[0]),
        database
          .select({
            id: match.id,
            status: match.status,
            teamA: match.teamA,
            teamB: match.teamB,
            venue: match.venue,
            scheduledAt: match.scheduledAt,
            playedAt: match.playedAt,
            points: sql<string>`COALESCE(SUM(${playerScore.pointsAwarded}), 0)::text`,
          })
          .from(teamPlayer)
          .innerJoin(team, eq(teamPlayer.teamId, team.id))
          .innerJoin(playerScore, eq(playerScore.playerId, teamPlayer.playerId))
          .innerJoin(match, eq(match.id, playerScore.matchId))
          .where(
            and(
              eq(team.id, teamRow.id),
              eq(match.tournamentId, tournamentId),
              eq(match.status, "completed"),
            ),
          )
          .groupBy(
            match.id,
            match.teamA,
            match.teamB,
            match.venue,
            match.scheduledAt,
            match.playedAt,
          )
          .orderBy(desc(match.playedAt), desc(match.scheduledAt))
          .limit(3),
      ]);

      playerCount = playerCountRow?.count ?? 0;
      recentMatches = activityRows.map((row) => {
        const teamA = franchiseForName(row.teamA);
        const teamB = franchiseForName(row.teamB);

        return {
          id: row.id,
          status: row.status as "completed",
          teamA: {
            name: row.teamA,
            shortCode: teamA.shortCode,
            accentColor: teamA.accentColor,
            logoPath: teamA.logoPath,
          },
          teamB: {
            name: row.teamB,
            shortCode: teamB.shortCode,
            accentColor: teamB.accentColor,
            logoPath: teamB.logoPath,
          },
          venue: row.venue,
          scheduledAt: row.scheduledAt.toISOString(),
          playedAt: row.playedAt?.toISOString() ?? null,
          points: Number(row.points),
        };
      });
    }

    const claimTier = currentClaim
      ? TIERS_BY_ID[currentClaim.tierId as TierId]
      : null;

    return NextResponse.json({
      user: {
        wallet,
        displayName: userRow?.username ?? DEFAULT_MANAGER_NAME,
        shortWallet: shortWallet(wallet),
      },
      tournament: {
        id: tournamentId,
        name: tournamentRow?.name ?? "PSL 2026 - Hackathon Cup",
        seasonLabel: DASHBOARD_SEASON_LABEL,
        subtitle: DASHBOARD_TOURNAMENT_SUBTITLE,
      },
      balances: {
        totalEarned: Number(totalEarnedPoints),
        onChainEarned: onChainEarned.toString(),
        walletBalance: walletBalance.toString(),
        unsynced: Number(formatUnits(unsyncedWei, BNDY_DECIMALS).split(".")[0]),
        pendingSync: pendingSync.toString(),
        minEarnedToQualify: MIN_EARNED_TO_CLAIM_BNDY,
      },
      team: {
        exists: teamRow != null,
        playerCount,
      },
      global: {
        rank: globalRank,
        totalPlayers: globalTotal,
        percentile: globalPercentile,
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
      claim:
        currentClaim && claimTier
          ? {
              status: currentClaim.status as "pending" | "confirmed",
              tierId: currentClaim.tierId as TierId,
              tierName: claimTier.name,
              tierDisplayName: claimTier.displayName,
              txHash: currentClaim.txHash,
              tokenId:
                currentClaim.trophyTokenId != null
                  ? Number(currentClaim.trophyTokenId)
                  : null,
              claimedAt: (
                currentClaim.confirmedAt ?? currentClaim.createdAt
              ).toISOString(),
              fulfillmentStatus: currentClaim.fulfillmentStatus as
                | "none"
                | "pending_shipping"
                | "shipped"
                | "delivered",
            }
          : null,
      recentMatches,
      upcomingMatches,
    } satisfies DashboardDTO);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load dashboard: ${msg}`);
  }
}
