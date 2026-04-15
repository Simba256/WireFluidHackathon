import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { getActiveTournamentId, match } from "@boundaryline/db";
import {
  franchiseForName,
  type FixturesResponseDTO,
} from "@boundaryline/shared";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const rows = await database
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
      .where(eq(match.tournamentId, tournamentId))
      .orderBy(asc(match.scheduledAt), asc(match.id));

    const fixtures: FixturesResponseDTO["fixtures"] = rows.map((row) => {
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
        points: null,
      };
    });

    return NextResponse.json({ fixtures } satisfies FixturesResponseDTO);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load fixtures: ${msg}`);
  }
}
