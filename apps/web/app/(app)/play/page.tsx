import { eq, asc, and, inArray } from "drizzle-orm";
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

  if (matchId && Number.isInteger(matchId) && matchId > 0) {
    const [row] = await database
      .select({
        id: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        venue: match.venue,
        scheduledAt: match.scheduledAt,
        status: match.status,
      })
      .from(match)
      .where(eq(match.id, matchId))
      .limit(1);
    matchRow = row ?? null;
  }

  if (!matchRow) {
    const [liveMatch] = await database
      .select({
        id: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        venue: match.venue,
        scheduledAt: match.scheduledAt,
        status: match.status,
      })
      .from(match)
      .where(eq(match.status, "live"))
      .limit(1);

    if (liveMatch) {
      matchRow = liveMatch;
    } else {
      const [scheduledMatch] = await database
        .select({
          id: match.id,
          teamA: match.teamA,
          teamB: match.teamB,
          venue: match.venue,
          scheduledAt: match.scheduledAt,
          status: match.status,
        })
        .from(match)
        .where(eq(match.status, "scheduled"))
        .orderBy(asc(match.scheduledAt))
        .limit(1);
      matchRow = scheduledMatch ?? null;
    }
  }

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
