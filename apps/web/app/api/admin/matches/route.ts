import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTournamentId, match } from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { badRequest, internalError, zodToResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  venue: z.string().min(1).optional(),
  scheduledAt: z.string().datetime(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return zodToResponse(parsed.error);
    body = parsed.data;
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);
    const [inserted] = await database
      .insert(match)
      .values({
        tournamentId,
        teamA: body.teamA,
        teamB: body.teamB,
        venue: body.venue ?? null,
        scheduledAt: new Date(body.scheduledAt),
        status: "scheduled",
      })
      .returning();
    if (!inserted) throw new Error("match insert returned no rows");

    return NextResponse.json(
      {
        match: {
          id: inserted.id,
          tournamentId: inserted.tournamentId,
          teamA: inserted.teamA,
          teamB: inserted.teamB,
          venue: inserted.venue,
          scheduledAt: inserted.scheduledAt.toISOString(),
          status: inserted.status,
          playedAt: inserted.playedAt?.toISOString() ?? null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to create match: ${msg}`);
  }
}
