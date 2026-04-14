import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "../src/client";
import { match, player, playerScore, prize, team, teamPlayer, tournament } from "../src/schema";

// Load .env.local from repo root so DATABASE_URL is available when running standalone
const ROOT = resolve(__dirname, '../../..');
const envPath = resolve(ROOT, '.env.local');
if (existsSync(envPath) && !process.env.DATABASE_URL) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (match && !process.env[match[1]!]) {
      process.env[match[1]!] = match[2]!;
    }
  }
}

interface PlayerSeed {
  externalId: string;
  name: string;
  team: string;
  role: "batsman" | "bowler" | "all-rounder" | "wicketkeeper";
  basePrice: number;
  photoUrl: string | null;
}

interface PrizeSeed {
  tierId: number;
  name: string;
  description: string;
  imageUrl: string;
  stockLimit: number;
  rankRequired: number;
}

interface MatchSeed {
  teamA: string;
  teamB: string;
  venue: string;
  scheduledAt: string;
  status: "scheduled" | "live" | "completed";
  playedAt: string | null;
}

const ROOT = resolve(__dirname, "../../..");

function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, relPath), "utf8")) as T;
}

async function main() {
  const db = getDb();

  const players = loadJson<PlayerSeed[]>("data/psl-2026-players.json");
  const prizes = loadJson<PrizeSeed[]>("data/prizes.json");
  const matches = loadJson<MatchSeed[]>("data/matches.json");

  console.log(`Clearing old data and seeding ${players.length} players…`);
  await db.delete(playerScore);
  await db.delete(teamPlayer);
  await db.delete(team);
  await db.delete(player);
  await db
    .insert(player)
    .values(
      players.map((p) => ({
        externalId: p.externalId,
        name: p.name,
        team: p.team,
        role: p.role,
        basePrice: p.basePrice,
        photoUrl: p.photoUrl ?? null,
      })),
    )
    .onConflictDoNothing({ target: player.externalId });

  console.log("Seeding tournament row…");
  const existingTournament = await db.select().from(tournament).limit(1);
  const tournamentId =
    existingTournament[0]?.id ??
    (
      await db
        .insert(tournament)
        .values({
          name: "PSL 2026 — Hackathon Cup",
          status: "active",
          startedAt: sql`now()`,
        })
        .returning({ id: tournament.id })
    )[0]!.id;

  console.log(
    `Seeding ${prizes.length} prize rows for tournament ${tournamentId}…`,
  );
  await db
    .insert(prize)
    .values(
      prizes.map((p) => ({
        tournamentId,
        tierId: p.tierId,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        stockLimit: p.stockLimit,
        rankRequired: p.rankRequired,
      })),
    )
    .onConflictDoNothing({ target: [prize.tournamentId, prize.tierId] });

  const existingMatches = await db
    .select({
      teamA: match.teamA,
      teamB: match.teamB,
      scheduledAt: match.scheduledAt,
    })
    .from(match)
    .where(sql`${match.tournamentId} = ${tournamentId}`);

  const existingMatchKeys = new Set(
    existingMatches.map(
      (row) => `${row.teamA}|${row.teamB}|${row.scheduledAt.toISOString()}`,
    ),
  );

  const missingMatches = matches.filter(
    (m) =>
      !existingMatchKeys.has(
        `${m.teamA}|${m.teamB}|${new Date(m.scheduledAt).toISOString()}`,
      ),
  );

  if (missingMatches.length > 0) {
    console.log(
      `Seeding ${missingMatches.length} match rows for tournament ${tournamentId}...`,
    );
    await db.insert(match).values(
      missingMatches.map((m) => ({
        tournamentId,
        teamA: m.teamA,
        teamB: m.teamB,
        venue: m.venue,
        scheduledAt: new Date(m.scheduledAt),
        status: m.status,
        playedAt: m.playedAt ? new Date(m.playedAt) : null,
      })),
    );
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
