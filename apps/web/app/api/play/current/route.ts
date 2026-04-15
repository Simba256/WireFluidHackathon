import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { match, player } from "@boundaryline/db";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Combined endpoint for the /play page: resolves the "match to show" with
// the same priority order as the previous server component (explicit id →
// live → next scheduled) AND returns the active players for the matched
// franchises in a single round-trip, so the client-side useQuery on /play
// only pays one network hop.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const matchIdParam = url.searchParams.get("matchId");
  const matchId =
    matchIdParam && /^\d+$/.test(matchIdParam) ? Number(matchIdParam) : null;
  const explicitId = matchId ?? -1;

  try {
    const database = db();

    const [matchRow] = await database
      .select({
        id: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        venue: match.venue,
        scheduledAt: match.scheduledAt,
        status: match.status,
      })
      .from(match)
      .where(
        sql`(${match.id} = ${explicitId} OR ${match.status} IN ('live', 'scheduled'))`,
      )
      .orderBy(
        sql`CASE WHEN ${match.id} = ${explicitId} THEN 0 WHEN ${match.status} = 'live' THEN 1 ELSE 2 END`,
        asc(match.scheduledAt),
      )
      .limit(1);

    const matchDto = matchRow
      ? {
          id: matchRow.id,
          teamA: matchRow.teamA,
          teamB: matchRow.teamB,
          venue: matchRow.venue,
          scheduledAt: matchRow.scheduledAt.toISOString(),
          status: matchRow.status as "live" | "scheduled" | "completed",
        }
      : null;

    const matchTeams = matchRow ? [matchRow.teamA, matchRow.teamB] : [];
    const players = await database
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        photoUrl: player.photoUrl,
      })
      .from(player)
      .where(
        matchTeams.length > 0
          ? and(eq(player.active, true), inArray(player.team, matchTeams))
          : eq(player.active, true),
      )
      .orderBy(asc(player.team), asc(player.name));

    return NextResponse.json({ match: matchDto, players });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load play data: ${msg}`);
  }
}
