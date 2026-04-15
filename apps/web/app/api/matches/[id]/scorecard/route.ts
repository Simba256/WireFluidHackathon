import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  match,
  player,
  playerScore,
  selectedTeam,
} from "@boundaryline/db";
import { API_ERROR_CODES, franchiseForName } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { errorResponse, internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  const { id: idParam } = await params;
  const matchId = Number(idParam);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return errorResponse(API_ERROR_CODES.VALIDATION_ERROR, "Invalid match id", 400);
  }

  try {
    const database = db();

    const [matchRow] = await database
      .select()
      .from(match)
      .where(eq(match.id, matchId))
      .limit(1);

    if (!matchRow) {
      return errorResponse(API_ERROR_CODES.MATCH_NOT_FOUND, "Match not found", 404);
    }

    const teamAMeta = franchiseForName(matchRow.teamA);
    const teamBMeta = franchiseForName(matchRow.teamB);

    const scores = await database
      .select({
        playerId: playerScore.playerId,
        runs: playerScore.runs,
        wickets: playerScore.wickets,
        catches: playerScore.catches,
        runOuts: playerScore.runOuts,
        stumpings: playerScore.stumpings,
        dismissedForZero: playerScore.dismissedForZero,
        pointsAwarded: playerScore.pointsAwarded,
      })
      .from(playerScore)
      .where(eq(playerScore.matchId, matchId));

    const scoredPlayerIds = scores.map((s) => s.playerId);

    const matchTeams = [matchRow.teamA, matchRow.teamB];
    const allPlayers = await database
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        photoUrl: player.photoUrl,
      })
      .from(player)
      .where(
        and(eq(player.active, true), inArray(player.team, matchTeams)),
      );

    const [userSquadRow] = await database
      .select()
      .from(selectedTeam)
      .where(
        and(
          eq(selectedTeam.userWallet, wallet),
          eq(selectedTeam.matchId, matchId),
        ),
      )
      .limit(1);

    const userSquadIds = new Set<number>();
    if (userSquadRow) {
      userSquadIds.add(userSquadRow.player1);
      userSquadIds.add(userSquadRow.player2);
      userSquadIds.add(userSquadRow.player3);
      userSquadIds.add(userSquadRow.player4);
      userSquadIds.add(userSquadRow.player5);
      userSquadIds.add(userSquadRow.player6);
      userSquadIds.add(userSquadRow.player7);
      userSquadIds.add(userSquadRow.player8);
      userSquadIds.add(userSquadRow.player9);
      userSquadIds.add(userSquadRow.player10);
      userSquadIds.add(userSquadRow.player11);
    }

    const scoreMap = new Map(scores.map((s) => [s.playerId, s]));

    const playerCards = allPlayers.map((p) => {
      const score = scoreMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        team: p.team,
        role: p.role,
        photoUrl: p.photoUrl,
        inUserSquad: userSquadIds.has(p.id),
        scored: score != null,
        stats: score
          ? {
              runs: score.runs,
              wickets: score.wickets,
              catches: score.catches,
              runOuts: score.runOuts,
              stumpings: score.stumpings,
              dismissedForZero: score.dismissedForZero,
              pointsAwarded: Number(score.pointsAwarded),
            }
          : null,
      };
    });

    playerCards.sort((a, b) => {
      const aPts = a.stats?.pointsAwarded ?? -1;
      const bPts = b.stats?.pointsAwarded ?? -1;
      return bPts - aPts;
    });

    let userSquadPoints = 0;
    for (const card of playerCards) {
      if (card.inUserSquad && card.stats) {
        userSquadPoints += card.stats.pointsAwarded;
      }
    }

    return NextResponse.json({
      match: {
        id: matchRow.id,
        teamA: {
          name: teamAMeta.name,
          shortCode: teamAMeta.shortCode,
          logoPath: teamAMeta.logoPath,
          accentColor: teamAMeta.accentColor,
        },
        teamB: {
          name: teamBMeta.name,
          shortCode: teamBMeta.shortCode,
          logoPath: teamBMeta.logoPath,
          accentColor: teamBMeta.accentColor,
        },
        venue: matchRow.venue,
        scheduledAt: matchRow.scheduledAt.toISOString(),
        status: matchRow.status,
        playedAt: matchRow.playedAt?.toISOString() ?? null,
        teamAScore: matchRow.teamAScore ?? null,
        teamBScore: matchRow.teamBScore ?? null,
      },
      players: playerCards,
      userSquadPoints,
      hasUserSquad: userSquadIds.size > 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load scorecard: ${msg}`);
  }
}
