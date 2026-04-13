import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  calculatePlayerPoints,
  match,
  player,
  playerScore,
  team,
  teamPlayer,
  userPoint,
} from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import {
  badRequest,
  errorResponse,
  internalError,
  zodToResponse,
} from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statSchema = z.object({
  playerId: z.number().int().positive(),
  runs: z.number().int().min(0).default(0),
  wickets: z.number().int().min(0).default(0),
  catches: z.number().int().min(0).default(0),
  runOuts: z.number().int().min(0).default(0),
  stumpings: z.number().int().min(0).default(0),
  dismissedForZero: z.boolean().default(false),
});

const bodySchema = z.object({
  playerStats: z.array(statSchema).min(1),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { id: idParam } = await ctx.params;
  const matchId = Number(idParam);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid match id");
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return zodToResponse(parsed.error);
    body = parsed.data;
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const ids = body.playerStats.map((s) => s.playerId);
  if (new Set(ids).size !== ids.length) {
    return badRequest(
      API_ERROR_CODES.DUPLICATE_PLAYER,
      "Duplicate player in stats payload",
    );
  }

  try {
    const database = db();

    const matchRows = await database
      .select()
      .from(match)
      .where(eq(match.id, matchId))
      .limit(1);
    const m = matchRows[0];
    if (!m) {
      return errorResponse(API_ERROR_CODES.NOT_FOUND, "Match not found", 404);
    }

    const validPlayers = await database
      .select({ id: player.id })
      .from(player)
      .where(inArray(player.id, ids));
    if (validPlayers.length !== ids.length) {
      return badRequest(
        API_ERROR_CODES.VALIDATION_ERROR,
        "One or more playerIds not found",
      );
    }

    const scoreRows = body.playerStats.map((s) => ({
      matchId,
      playerId: s.playerId,
      runs: s.runs,
      wickets: s.wickets,
      catches: s.catches,
      runOuts: s.runOuts,
      stumpings: s.stumpings,
      dismissedForZero: s.dismissedForZero,
      pointsAwarded: calculatePlayerPoints(s),
    }));

    const totalPointsAwarded = scoreRows.reduce(
      (acc, r) => acc + r.pointsAwarded,
      0n,
    );

    const result = await database.transaction(async (tx) => {
      await tx
        .insert(playerScore)
        .values(scoreRows)
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

      const affectedTeams = await tx
        .selectDistinct({
          wallet: team.userWallet,
          tournamentId: team.tournamentId,
          playerId: teamPlayer.playerId,
        })
        .from(teamPlayer)
        .innerJoin(team, eq(teamPlayer.teamId, team.id))
        .where(
          and(
            eq(team.tournamentId, m.tournamentId),
            inArray(teamPlayer.playerId, ids),
          ),
        );

      const pointsByPlayer = new Map<number, bigint>(
        scoreRows.map((r) => [r.playerId, r.pointsAwarded]),
      );

      const deltaByWallet = new Map<string, bigint>();
      for (const row of affectedTeams) {
        const pts = pointsByPlayer.get(row.playerId) ?? 0n;
        deltaByWallet.set(
          row.wallet,
          (deltaByWallet.get(row.wallet) ?? 0n) + pts,
        );
      }

      for (const [wallet, delta] of deltaByWallet) {
        await tx
          .insert(userPoint)
          .values({
            wallet,
            tournamentId: m.tournamentId,
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
      }

      await tx
        .update(match)
        .set({ status: "completed", playedAt: new Date() })
        .where(eq(match.id, matchId));

      return { usersAffected: deltaByWallet.size };
    });

    return NextResponse.json({
      matchId,
      usersAffected: result.usersAffected,
      totalPointsAwarded: totalPointsAwarded.toString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to submit scores: ${msg}`);
  }
}
