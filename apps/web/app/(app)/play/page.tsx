import { eq, asc, and, inArray, sql } from "drizzle-orm";
import { player, match } from "@boundaryline/db";
import { TEAM_SIZE } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { TeamPickerClient } from "./team-picker-client";
import { MatchScorecardClient } from "./match-scorecard-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ matchId?: string }>;
}

export default async function PlayPage({ searchParams }: Props) {
  const { matchId: matchIdParam } = await searchParams;
  const database = db();

  const matchId = matchIdParam ? Number(matchIdParam) : null;

  let matchRow: {
    id: number;
    teamA: string;
    teamB: string;
    venue: string | null;
    scheduledAt: Date;
    status: string;
  } | null = null;

  const hasExplicitId = matchId != null && Number.isInteger(matchId) && matchId > 0;
  const explicitIdFilter = hasExplicitId ? matchId : -1;

  // Single query replaces the prior three sequential lookups. Priority:
  // (1) the explicit matchId if provided, (2) any live match,
  // (3) the next scheduled match by scheduledAt.
  const [candidate] = await database
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
      sql`(${match.id} = ${explicitIdFilter} OR ${match.status} IN ('live', 'scheduled'))`,
    )
    .orderBy(
      sql`CASE WHEN ${match.id} = ${explicitIdFilter} THEN 0 WHEN ${match.status} = 'live' THEN 1 ELSE 2 END`,
      asc(match.scheduledAt),
    )
    .limit(1);
  matchRow = candidate ?? null;

  // If match is live or completed, show the scorecard view
  if (matchRow && matchRow.status !== "scheduled") {
    return <MatchScorecardClient matchId={matchRow.id} />;
  }

  // Otherwise show the team picker for squad selection
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

  return (
    <TeamPickerClient
      players={players}
      currentMatch={matchDto}
      teamSize={TEAM_SIZE}
    />
  );
}
