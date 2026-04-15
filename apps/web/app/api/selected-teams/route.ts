import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { match, player, selectedTeam } from "@boundaryline/db";
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
  matchId: z.number().int().positive(),
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

    const [matchRow] = await database
      .select({ id: match.id, status: match.status })
      .from(match)
      .where(eq(match.id, body.matchId))
      .limit(1);

    if (!matchRow) {
      return errorResponse(
        API_ERROR_CODES.MATCH_NOT_FOUND,
        "Match not found",
        404,
      );
    }

    if (matchRow.status !== "scheduled") {
      return errorResponse(
        API_ERROR_CODES.MATCH_LOCKED,
        "Match has started — squad is locked",
        409,
      );
    }

    const validPlayers = await database
      .select({ id: player.id })
      .from(player)
      .where(and(inArray(player.id, body.playerIds), eq(player.active, true)));

    if (validPlayers.length !== TEAM_SIZE) {
      return badRequest(
        API_ERROR_CODES.INVALID_TEAM_SIZE,
        "One or more players not found or inactive",
      );
    }

    const sorted = [...body.playerIds].sort((a, b) => a - b);
    const values = {
      userWallet: wallet,
      matchId: body.matchId,
      player1: sorted[0]!,
      player2: sorted[1]!,
      player3: sorted[2]!,
      player4: sorted[3]!,
      player5: sorted[4]!,
      player6: sorted[5]!,
      player7: sorted[6]!,
      player8: sorted[7]!,
      player9: sorted[8]!,
      player10: sorted[9]!,
      player11: sorted[10]!,
      updatedAt: new Date(),
    };

    const [row] = await database
      .insert(selectedTeam)
      .values(values)
      .onConflictDoUpdate({
        target: [selectedTeam.userWallet, selectedTeam.matchId],
        set: {
          player1: values.player1,
          player2: values.player2,
          player3: values.player3,
          player4: values.player4,
          player5: values.player5,
          player6: values.player6,
          player7: values.player7,
          player8: values.player8,
          player9: values.player9,
          player10: values.player10,
          player11: values.player11,
          updatedAt: values.updatedAt,
        },
      })
      .returning({
        id: selectedTeam.id,
        createdAt: selectedTeam.createdAt,
        updatedAt: selectedTeam.updatedAt,
      });

    return NextResponse.json(
      {
        selectedTeam: {
          id: row!.id,
          matchId: body.matchId,
          playerIds: sorted,
          createdAt: row!.createdAt.toISOString(),
          updatedAt: row!.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to save selected team: ${msg}`);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  const matchIdParam = req.nextUrl.searchParams.get("matchId");
  if (!matchIdParam) {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "matchId is required");
  }
  const matchId = Number(matchIdParam);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid matchId");
  }

  try {
    const database = db();

    const [matchRow] = await database
      .select({ id: match.id, status: match.status })
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

    const [row] = await database
      .select()
      .from(selectedTeam)
      .where(
        and(
          eq(selectedTeam.userWallet, wallet),
          eq(selectedTeam.matchId, matchId),
        ),
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({
        selectedTeam: null,
        matchStatus: matchRow.status,
      });
    }

    const playerIds = [
      row.player1,
      row.player2,
      row.player3,
      row.player4,
      row.player5,
      row.player6,
      row.player7,
      row.player8,
      row.player9,
      row.player10,
      row.player11,
    ];

    const players = await database
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        photoUrl: player.photoUrl,
      })
      .from(player)
      .where(inArray(player.id, playerIds));

    return NextResponse.json({
      selectedTeam: {
        id: row.id,
        matchId: row.matchId,
        playerIds,
        players,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      matchStatus: matchRow.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load selected team: ${msg}`);
  }
}
