import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { tournament } from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { badRequest, errorResponse, internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { id: idParam } = await ctx.params;
  const tournamentId = Number(idParam);
  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid tournament id");
  }

  try {
    const database = db();
    const now = new Date();
    const graceEnds = new Date(now.getTime() + GRACE_DURATION_MS);

    const [updated] = await database
      .update(tournament)
      .set({ status: "closed", closedAt: now, graceEnds })
      .where(eq(tournament.id, tournamentId))
      .returning();

    if (!updated) {
      return errorResponse(
        API_ERROR_CODES.NOT_FOUND,
        "Tournament not found",
        404,
      );
    }

    return NextResponse.json({
      tournament: {
        id: updated.id,
        status: updated.status,
        closedAt: updated.closedAt?.toISOString() ?? null,
        graceEnds: updated.graceEnds?.toISOString() ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to close tournament: ${msg}`);
  }
}
