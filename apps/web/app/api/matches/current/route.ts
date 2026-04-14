import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { match, getActiveTournamentId } from "@boundaryline/db";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const liveRows = await database
      .select()
      .from(match)
      .where(eq(match.status, "live"))
      .limit(1);

    const row =
      liveRows[0] ??
      (
        await database
          .select()
          .from(match)
          .where(eq(match.status, "scheduled"))
          .orderBy(asc(match.scheduledAt))
          .limit(1)
      )[0];

    if (!row) {
      return NextResponse.json({ match: null });
    }

    return NextResponse.json({
      match: {
        id: row.id,
        tournamentId: row.tournamentId,
        teamA: row.teamA,
        teamB: row.teamB,
        scheduledAt: row.scheduledAt.toISOString(),
        status: row.status,
        playedAt: row.playedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load current match: ${msg}`);
  }
}
