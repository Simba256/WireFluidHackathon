import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { getDb } from '../src/client';
import { player, prize, tournament } from '../src/schema';

interface PlayerSeed {
  externalId: string;
  name: string;
  team: string;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper';
  basePrice: number;
}

interface PrizeSeed {
  tierId: number;
  name: string;
  description: string;
  imageUrl: string;
  stockLimit: number;
  rankRequired: number;
}

const ROOT = resolve(__dirname, '../../..');

function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, relPath), 'utf8')) as T;
}

async function main() {
  const db = getDb();

  const players = loadJson<PlayerSeed[]>('data/psl-2026-players.json');
  const prizes = loadJson<PrizeSeed[]>('data/prizes.json');

  console.log(`Seeding ${players.length} players…`);
  await db
    .insert(player)
    .values(
      players.map((p) => ({
        externalId: p.externalId,
        name: p.name,
        team: p.team,
        role: p.role,
        basePrice: p.basePrice,
      })),
    )
    .onConflictDoNothing({ target: player.externalId });

  console.log('Seeding tournament row…');
  const existingTournament = await db.select().from(tournament).limit(1);
  const tournamentId =
    existingTournament[0]?.id ??
    (
      await db
        .insert(tournament)
        .values({
          name: 'PSL 2026 — Hackathon Cup',
          status: 'active',
          startedAt: sql`now()`,
        })
        .returning({ id: tournament.id })
    )[0]!.id;

  console.log(`Seeding ${prizes.length} prize rows for tournament ${tournamentId}…`);
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

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
