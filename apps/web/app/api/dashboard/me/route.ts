import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  DASHBOARD_SEASON_LABEL,
  DASHBOARD_TOURNAMENT_SUBTITLE,
  DEFAULT_MANAGER_NAME,
  MIN_EARNED_TO_CLAIM_BNDY,
  TIERS_BY_ID,
  franchiseForName,
  type DashboardSummaryDTO,
  type TierId,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";
import {
  expireStaleClaims,
  expireStaleSyncRecords,
  getPendingSyncAmount,
} from "@/lib/prize-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 5)}...${wallet.slice(-4)}`;
}

function toMatchActivity(
  row: {
    id: number;
    fixtureNumber: number;
    status: string;
    teamA: string;
    teamB: string;
    venue: string | null;
    scheduledAt: Date;
    playedAt: Date | null;
    teamAScore: string | null;
    teamBScore: string | null;
  },
  points: number | null,
): DashboardSummaryDTO["recentMatches"][number] {
  const teamA = franchiseForName(row.teamA);
  const teamB = franchiseForName(row.teamB);

  return {
    id: row.id,
    fixtureNumber: row.fixtureNumber,
    status: row.status as "scheduled" | "live" | "completed",
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
    teamAScore: row.teamAScore,
    teamBScore: row.teamBScore,
    points,
  };
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
      .select({ username: user.username, avatarUrl: user.avatarUrl })
      .from(user)
      .where(eq(user.wallet, wallet))
      .limit(1);

    const [pointRow, teamRow, currentClaim, pendingSync] = await Promise.all([
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
      getPendingSyncAmount(database, wallet, tournamentId),
    ]);

    const totalEarnedPoints = pointRow?.totalPoints ?? 0n;

    let playerCount = 0;
    let recentMatches: DashboardSummaryDTO["recentMatches"] = [];
    let upcomingMatches: DashboardSummaryDTO["upcomingMatches"] = [];

    const [liveRows, scheduledRows] = await Promise.all([
      database
        .select({
          id: match.id,
          fixtureNumber:
            sql<number>`ROW_NUMBER() OVER (ORDER BY ${match.scheduledAt}, ${match.id})`.as(
              "fixture_number",
            ),
          status: match.status,
          teamA: match.teamA,
          teamB: match.teamB,
          venue: match.venue,
          scheduledAt: match.scheduledAt,
          playedAt: match.playedAt,
          teamAScore: match.teamAScore,
          teamBScore: match.teamBScore,
        })
        .from(match)
        .where(
          and(eq(match.tournamentId, tournamentId), eq(match.status, "live")),
        )
        .orderBy(match.scheduledAt),
      database
        .select({
          id: match.id,
          fixtureNumber:
            sql<number>`ROW_NUMBER() OVER (ORDER BY ${match.scheduledAt}, ${match.id})`.as(
              "fixture_number",
            ),
          status: match.status,
          teamA: match.teamA,
          teamB: match.teamB,
          venue: match.venue,
          scheduledAt: match.scheduledAt,
          playedAt: match.playedAt,
          teamAScore: match.teamAScore,
          teamBScore: match.teamBScore,
        })
        .from(match)
        .where(
          and(
            eq(match.tournamentId, tournamentId),
            eq(match.status, "scheduled"),
          ),
        )
        .orderBy(match.scheduledAt)
        .limit(2),
    ]);

    upcomingMatches = [...liveRows, ...scheduledRows].map((row) =>
      toMatchActivity(row, null),
    );

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
            fixtureNumber:
              sql<number>`ROW_NUMBER() OVER (ORDER BY ${match.scheduledAt}, ${match.id})`.as(
                "fixture_number",
              ),
            status: match.status,
            teamA: match.teamA,
            teamB: match.teamB,
            venue: match.venue,
            scheduledAt: match.scheduledAt,
            playedAt: match.playedAt,
            teamAScore: match.teamAScore,
            teamBScore: match.teamBScore,
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
            match.teamAScore,
            match.teamBScore,
          )
          .orderBy(desc(match.playedAt), desc(match.scheduledAt))
          .limit(2),
      ]);

      playerCount = playerCountRow?.count ?? 0;
      recentMatches = activityRows.map((row) =>
        toMatchActivity(row, Number(row.points)),
      );
    }

    const claimTier = currentClaim
      ? TIERS_BY_ID[currentClaim.tierId as TierId]
      : null;

    return NextResponse.json({
      user: {
        wallet,
        username: userRow?.username ?? DEFAULT_MANAGER_NAME,
        avatarUrl: userRow?.avatarUrl ?? null,
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
        pendingSync: pendingSync.toString(),
        minEarnedToQualify: MIN_EARNED_TO_CLAIM_BNDY,
      },
      team: {
        exists: teamRow != null,
        playerCount,
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
    } satisfies DashboardSummaryDTO);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load dashboard: ${msg}`);
  }
}
