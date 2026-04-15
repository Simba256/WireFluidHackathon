import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  calculatePlayerPoints,
  match,
  player,
  playerScore,
  selectedTeam,
  userPoint,
} from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { badRequest, errorResponse, internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo-only match simulator. Ungated: clicking Play on the match detail
// page generates deterministic synthetic stats for every player on both
// franchises, credits every user who submitted a lineup for the match,
// and flips the match to completed.

type Stats = {
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissedForZero: boolean;
};

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function simulatePlayerStats(
  matchId: number,
  playerId: number,
  role: string,
): Stats {
  const rand = seededRandom(matchId * 1_000_003 + playerId);
  const r = (n: number) => Math.floor(rand() * n);

  const base: Stats = {
    runs: 0,
    wickets: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
    dismissedForZero: false,
  };

  if (role === "batsman") {
    base.runs = r(85);
    base.catches = rand() < 0.2 ? 1 : 0;
    base.runOuts = rand() < 0.08 ? 1 : 0;
  } else if (role === "bowler") {
    base.wickets = r(5) + (rand() < 0.15 ? 1 : 0);
    base.runs = r(16);
    base.catches = rand() < 0.25 ? 1 : 0;
  } else if (role === "all-rounder") {
    base.runs = 10 + r(45);
    base.wickets = r(3);
    base.catches = rand() < 0.25 ? 1 : 0;
    base.runOuts = rand() < 0.1 ? 1 : 0;
  } else if (role === "wicketkeeper") {
    base.runs = r(65);
    base.catches = r(3);
    base.stumpings = rand() < 0.3 ? 1 : 0;
  } else {
    base.runs = r(40);
    base.wickets = r(2);
    base.catches = rand() < 0.2 ? 1 : 0;
  }

  if (base.runs === 0 && base.wickets === 0 && rand() < 0.18) {
    base.dismissedForZero = true;
  }
  return base;
}

function formatScoreline(runs: number, wicketsLost: number): string {
  const wk = Math.min(10, wicketsLost);
  return `${runs}/${wk} (20.0)`;
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: idParam } = await ctx.params;
  const matchId = Number(idParam);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid match id");
  }

  try {
    const database = db();

    const [matchRow] = await database
      .select()
      .from(match)
      .where(eq(match.id, matchId))
      .limit(1);

    if (!matchRow) {
      return errorResponse(
        API_ERROR_CODES.MATCH_NOT_FOUND,
        "Match not found",
        404,
      );
    }

    if (matchRow.status === "completed") {
      return badRequest(
        API_ERROR_CODES.VALIDATION_ERROR,
        "Match already completed",
      );
    }

    const players = await database
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
      })
      .from(player)
      .where(
        and(
          eq(player.active, true),
          inArray(player.team, [matchRow.teamA, matchRow.teamB]),
        ),
      );

    if (players.length === 0) {
      return badRequest(
        API_ERROR_CODES.VALIDATION_ERROR,
        "No active players found for this fixture",
      );
    }

    const scoreRows = players.map((p) => {
      const stats = simulatePlayerStats(matchId, p.id, p.role);
      return {
        matchId,
        playerId: p.id,
        ...stats,
        pointsAwarded: calculatePlayerPoints(stats),
      };
    });

    const pointsByPlayer = new Map<number, bigint>(
      scoreRows.map((r) => [r.playerId, r.pointsAwarded]),
    );

    let teamARuns = 0;
    let teamAWk = 0;
    let teamBRuns = 0;
    let teamBWk = 0;
    const teamByPlayer = new Map(players.map((p) => [p.id, p.team]));
    for (const row of scoreRows) {
      const t = teamByPlayer.get(row.playerId);
      if (t === matchRow.teamA) {
        teamARuns += row.runs;
        if (row.dismissedForZero || row.runs === 0) teamAWk += 1;
      } else if (t === matchRow.teamB) {
        teamBRuns += row.runs;
        if (row.dismissedForZero || row.runs === 0) teamBWk += 1;
      }
    }

    const result = await database.transaction(async (tx) => {
      for (const row of scoreRows) {
        await tx
          .insert(playerScore)
          .values(row)
          .onConflictDoUpdate({
            target: [playerScore.matchId, playerScore.playerId],
            set: {
              runs: sql`excluded.runs`,
              wickets: sql`excluded.wickets`,
              catches: sql`excluded.catches`,
              runOuts: sql`excluded.run_outs`,
              stumpings: sql`excluded.stumpings`,
              dismissedForZero: sql`excluded.dismissed_for_zero`,
              pointsAwarded: sql`excluded.points_awarded`,
            },
          });
      }

      const lineups = await tx
        .select()
        .from(selectedTeam)
        .where(eq(selectedTeam.matchId, matchId));

      let usersCredited = 0;
      for (const lineup of lineups) {
        const picks = [
          lineup.player1,
          lineup.player2,
          lineup.player3,
          lineup.player4,
          lineup.player5,
          lineup.player6,
          lineup.player7,
          lineup.player8,
          lineup.player9,
          lineup.player10,
          lineup.player11,
        ];
        let delta = 0n;
        for (const pid of picks) {
          delta += pointsByPlayer.get(pid) ?? 0n;
        }
        if (delta === 0n) continue;

        await tx
          .insert(userPoint)
          .values({
            wallet: lineup.userWallet,
            tournamentId: matchRow.tournamentId,
            totalPoints: delta,
            lastMatchId: matchId,
          })
          .onConflictDoUpdate({
            target: [userPoint.wallet, userPoint.tournamentId],
            set: {
              totalPoints: sql`${userPoint.totalPoints} + ${delta.toString()}::bigint`,
              lastMatchId: matchId,
              updatedAt: new Date(),
            },
          });
        usersCredited += 1;
      }

      await tx
        .update(match)
        .set({
          status: "completed",
          playedAt: new Date(),
          teamAScore: formatScoreline(teamARuns, teamAWk),
          teamBScore: formatScoreline(teamBRuns, teamBWk),
        })
        .where(eq(match.id, matchId));

      return { usersCredited };
    });

    return NextResponse.json({
      matchId,
      usersCredited: result.usersCredited,
      teamAScore: formatScoreline(teamARuns, teamAWk),
      teamBScore: formatScoreline(teamBRuns, teamBWk),
      playersScored: scoreRows.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to simulate match: ${msg}`);
  }
}
