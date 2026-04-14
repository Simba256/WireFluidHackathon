import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  getActiveTournamentId,
  player,
  team,
  teamPlayer,
} from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { errorResponse, internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const teamRows = await database
      .select({
        id: team.id,
        createdAt: team.createdAt,
      })
      .from(team)
      .where(
        and(eq(team.userWallet, wallet), eq(team.tournamentId, tournamentId)),
      )
      .limit(1);

    const t = teamRows[0];
    if (!t) {
      return errorResponse(API_ERROR_CODES.NO_TEAM, "No team found", 404);
    }

    const players = await database
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        photoUrl: player.photoUrl,
      })
      .from(teamPlayer)
      .innerJoin(player, eq(teamPlayer.playerId, player.id))
      .where(eq(teamPlayer.teamId, t.id));

    return NextResponse.json({
      team: {
        id: t.id,
        wallet,
        players,
        createdAt: t.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load team: ${msg}`);
  }
}
