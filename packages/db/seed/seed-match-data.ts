import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../src/client";
import { match, player, playerScore, selectedTeam } from "../src/schema";

const ROOT = resolve(__dirname, "../../..");
const envPath = resolve(ROOT, "apps/web/.env.local");
if (existsSync(envPath) && !process.env.DATABASE_URL) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]!]) {
      process.env[m[1]!] = m[2]!;
    }
  }
}

const USER_WALLET = "0x6f3cc21a83e4ca306afd8b973c6281466157e17c";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function calculatePoints(stats: {
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissedForZero: boolean;
}): number {
  let pts = stats.runs + stats.wickets * 25 + stats.catches * 10 + stats.runOuts * 10 + stats.stumpings * 10;

  if (stats.runs >= 100) pts += 50;
  else if (stats.runs >= 50) pts += 20;

  if (stats.wickets >= 5) pts += 50;

  if (stats.dismissedForZero) pts -= 5;

  return Math.max(0, pts);
}

interface GeneratedStats {
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissedForZero: boolean;
}

function generateStats(
  role: string,
  rand: () => number,
): GeneratedStats {
  let runs = 0;
  let wickets = 0;
  const catches = rand() < 0.35 ? Math.floor(rand() * 3) + 1 : 0;
  const runOuts = rand() < 0.08 ? 1 : 0;
  let stumpings = 0;

  if (role === "batsman" || role === "wicketkeeper") {
    const r = rand();
    if (r < 0.08) runs = Math.floor(rand() * 40) + 70;      // big score
    else if (r < 0.3) runs = Math.floor(rand() * 30) + 25;   // solid knock
    else if (r < 0.7) runs = Math.floor(rand() * 20) + 5;    // modest
    else runs = Math.floor(rand() * 5);                        // low / duck

    if (role === "wicketkeeper" && rand() < 0.2) stumpings = 1;
    if (rand() < 0.15) wickets = 1;
  } else if (role === "bowler") {
    const w = rand();
    if (w < 0.05) wickets = Math.floor(rand() * 2) + 4;      // 4-5 wickets
    else if (w < 0.25) wickets = Math.floor(rand() * 2) + 2;  // 2-3 wickets
    else if (w < 0.55) wickets = 1;
    else wickets = 0;

    runs = Math.floor(rand() * 20);
  } else {
    // all-rounder
    runs = Math.floor(rand() * 50) + (rand() < 0.15 ? 30 : 0);
    const w = rand();
    if (w < 0.08) wickets = Math.floor(rand() * 2) + 3;
    else if (w < 0.3) wickets = Math.floor(rand() * 2) + 1;
    else wickets = 0;
  }

  const dismissedForZero = runs === 0 && (role === "batsman" || role === "wicketkeeper" || role === "all-rounder") && rand() < 0.6;

  return { runs, wickets, catches, runOuts, stumpings, dismissedForZero };
}

function generateScore(teamRuns: number): string {
  const wickets = Math.floor(Math.random() * 6) + 3;
  const overs = wickets >= 10 ? `${Math.floor(Math.random() * 4) + 16}.${Math.floor(Math.random() * 6)}` : "20.0";
  return `${teamRuns}/${wickets} (${overs})`;
}

async function main() {
  const db = getDb();

  const completedMatches = await db
    .select({
      id: match.id,
      teamA: match.teamA,
      teamB: match.teamB,
      scheduledAt: match.scheduledAt,
    })
    .from(match)
    .where(eq(match.status, "completed"));

  console.log(`Found ${completedMatches.length} completed matches`);

  const allTeamNames = [
    ...new Set(completedMatches.flatMap((m) => [m.teamA, m.teamB])),
  ];

  const allPlayers = await db
    .select({ id: player.id, name: player.name, team: player.team, role: player.role })
    .from(player)
    .where(and(eq(player.active, true), inArray(player.team, allTeamNames)));

  const playersByTeam = new Map<string, typeof allPlayers>();
  for (const p of allPlayers) {
    if (!playersByTeam.has(p.team)) playersByTeam.set(p.team, []);
    playersByTeam.get(p.team)!.push(p);
  }

  console.log(`Teams loaded: ${[...playersByTeam.keys()].join(", ")}`);
  for (const [team, players] of playersByTeam) {
    console.log(`  ${team}: ${players.length} players`);
  }

  // Clear existing data to allow re-running
  const completedIds = completedMatches.map((m) => m.id);
  await db.delete(playerScore).where(inArray(playerScore.matchId, completedIds));
  await db.delete(selectedTeam).where(
    and(
      eq(selectedTeam.userWallet, USER_WALLET),
      inArray(selectedTeam.matchId, completedIds),
    ),
  );
  console.log("Cleared existing player_score and selected_team rows for completed matches");

  let totalScoreRows = 0;
  let totalSelectedTeams = 0;

  for (const m of completedMatches) {
    const rand = seededRandom(m.id * 7919);

    const teamAPlayers = playersByTeam.get(m.teamA) ?? [];
    const teamBPlayers = playersByTeam.get(m.teamB) ?? [];

    if (teamAPlayers.length < 11 || teamBPlayers.length < 11) {
      console.warn(`Skipping match ${m.id}: ${m.teamA} has ${teamAPlayers.length}, ${m.teamB} has ${teamBPlayers.length}`);
      continue;
    }

    const playing11A = teamAPlayers.slice(0, 11);
    const playing11B = teamBPlayers.slice(0, 11);
    const all22 = [...playing11A, ...playing11B];

    // Generate player_score rows
    const scoreRows: Array<{
      matchId: number;
      playerId: number;
      runs: number;
      wickets: number;
      catches: number;
      runOuts: number;
      stumpings: number;
      dismissedForZero: boolean;
      pointsAwarded: bigint;
    }> = [];

    let teamATotalRuns = 0;
    let teamBTotalRuns = 0;

    for (const p of all22) {
      const stats = generateStats(p.role, rand);
      const points = calculatePoints(stats);

      if (playing11A.includes(p)) teamATotalRuns += stats.runs;
      else teamBTotalRuns += stats.runs;

      scoreRows.push({
        matchId: m.id,
        playerId: p.id,
        runs: stats.runs,
        wickets: stats.wickets,
        catches: stats.catches,
        runOuts: stats.runOuts,
        stumpings: stats.stumpings,
        dismissedForZero: stats.dismissedForZero,
        pointsAwarded: BigInt(points),
      });
    }

    await db.insert(playerScore).values(scoreRows);
    totalScoreRows += scoreRows.length;

    // Update match scores
    const teamAScore = generateScore(teamATotalRuns);
    const teamBScore = generateScore(teamBTotalRuns);

    await db
      .update(match)
      .set({
        teamAScore: teamAScore,
        teamBScore: teamBScore,
        playedAt: m.scheduledAt,
      })
      .where(eq(match.id, m.id));

    // Pick 11 random players for user's selected_team (mix of both teams)
    const shuffled = [...all22].sort(() => rand() - 0.5);
    const userPicks = shuffled.slice(0, 11).sort((a, b) => a.id - b.id);

    await db.insert(selectedTeam).values({
      userWallet: USER_WALLET,
      matchId: m.id,
      player1: userPicks[0]!.id,
      player2: userPicks[1]!.id,
      player3: userPicks[2]!.id,
      player4: userPicks[3]!.id,
      player5: userPicks[4]!.id,
      player6: userPicks[5]!.id,
      player7: userPicks[6]!.id,
      player8: userPicks[7]!.id,
      player9: userPicks[8]!.id,
      player10: userPicks[9]!.id,
      player11: userPicks[10]!.id,
    });
    totalSelectedTeams++;

    console.log(
      `Match ${m.id}: ${m.teamA} ${teamAScore} vs ${m.teamB} ${teamBScore} — 22 scores, squad [${userPicks.map((p) => p.name).join(", ")}]`,
    );
  }

  console.log(`\nDone! Inserted ${totalScoreRows} player_score rows, ${totalSelectedTeams} selected_team rows, updated ${completedMatches.length} match scores.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
