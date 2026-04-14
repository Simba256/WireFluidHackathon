import { eq, asc } from "drizzle-orm";
import { player, match, getActiveTournamentId } from "@boundaryline/db";
import { TEAM_SIZE } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { TeamPickerClient } from "./team-picker-client";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const database = db();
  const tournamentId = await getActiveTournamentId(database);

  const [players, currentMatch] = await Promise.all([
    database
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        photoUrl: player.photoUrl,
      })
      .from(player)
      .where(eq(player.active, true))
      .orderBy(asc(player.team), asc(player.name)),

    database
      .select()
      .from(match)
      .where(eq(match.status, "live"))
      .limit(1)
      .then(async (rows) => {
        if (rows[0]) return rows[0];
        const scheduled = await database
          .select()
          .from(match)
          .where(eq(match.status, "scheduled"))
          .orderBy(asc(match.scheduledAt))
          .limit(1);
        return scheduled[0] ?? null;
      }),
  ]);

  const matchDto = currentMatch
    ? {
        id: currentMatch.id,
        teamA: currentMatch.teamA,
        teamB: currentMatch.teamB,
        scheduledAt: currentMatch.scheduledAt.toISOString(),
        status: currentMatch.status as "live" | "scheduled" | "completed",
      }
    : null;

  return (
    <TeamPickerClient
      players={players}
      currentMatch={matchDto}
      tournamentId={tournamentId}
      teamSize={TEAM_SIZE}
    />
  );
}
