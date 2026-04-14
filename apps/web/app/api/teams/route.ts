import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import {
  getActiveTournamentId,
  player,
  team,
  teamPlayer,
} from "@boundaryline/db";
import { API_ERROR_CODES, TEAM_SIZE } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  badRequest,
  errorResponse,
  internalError,
  zodToResponse,
} from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  playerIds: z.array(z.number().int().positive()),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return zodToResponse(parsed.error);
    body = parsed.data;
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  if (body.playerIds.length !== TEAM_SIZE) {
    return badRequest(
      API_ERROR_CODES.INVALID_TEAM_SIZE,
      `Must select exactly ${TEAM_SIZE} players`,
    );
  }

  const unique = new Set(body.playerIds);
  if (unique.size !== body.playerIds.length) {
    return badRequest(API_ERROR_CODES.DUPLICATE_PLAYER, "Duplicate player");
  }

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const existing = await database
      .select({ id: team.id })
      .from(team)
      .where(
        and(eq(team.userWallet, wallet), eq(team.tournamentId, tournamentId)),
      )
      .limit(1);
    if (existing.length > 0) {
      return errorResponse(
        API_ERROR_CODES.TEAM_EXISTS,
        "Team already exists",
        409,
      );
    }

    const selectedPlayers = await database
      .select({ id: player.id })
      .from(player)
      .where(and(inArray(player.id, body.playerIds), eq(player.active, true)));

    if (selectedPlayers.length !== TEAM_SIZE) {
      return badRequest(
        API_ERROR_CODES.INVALID_TEAM_SIZE,
        "One or more players not found or inactive",
      );
    }

    const created = await database.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(team)
        .values({
          userWallet: wallet,
          tournamentId,
        })
        .returning({
          id: team.id,
          createdAt: team.createdAt,
        });
      if (!inserted) throw new Error("team insert returned no rows");

      await tx.insert(teamPlayer).values(
        body.playerIds.map((pid) => ({
          teamId: inserted.id,
          playerId: pid,
        })),
      );

      return inserted;
    });

    return NextResponse.json(
      {
        team: {
          id: created.id,
          wallet,
          playerIds: body.playerIds,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    // Unique-constraint race on (user_wallet, tournament_id)
    if (msg.includes("team_user_tournament_key")) {
      return errorResponse(
        API_ERROR_CODES.TEAM_EXISTS,
        "Team already exists",
        409,
      );
    }
    return internalError(`Failed to create team: ${msg}`);
  }
}
