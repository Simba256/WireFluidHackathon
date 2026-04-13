import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from './client';
import { claim, playerScore, userPoint } from './schema';

export interface ScoreInput {
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  dismissedForZero: boolean;
}

export function calculatePlayerPoints(s: ScoreInput): bigint {
  let pts =
    s.runs +
    s.wickets * 25 +
    s.catches * 10 +
    s.runOuts * 10 +
    s.stumpings * 10;
  if (s.runs >= 100) pts += 50;
  else if (s.runs >= 50) pts += 20;
  if (s.wickets >= 5) pts += 50;
  if (s.dismissedForZero) pts -= 5;
  return BigInt(pts);
}

export async function getGlobalLeaderboard(
  db: Database,
  tournamentId: number,
  limit = 100,
  offset = 0,
) {
  return db
    .select({
      wallet: userPoint.wallet,
      totalPoints: userPoint.totalPoints,
      rank: sql<number>`RANK() OVER (ORDER BY ${userPoint.totalPoints} DESC)`.as('rank'),
    })
    .from(userPoint)
    .where(eq(userPoint.tournamentId, tournamentId))
    .orderBy(desc(userPoint.totalPoints))
    .limit(limit)
    .offset(offset);
}

export async function getTierStockClaimed(db: Database, tournamentId: number) {
  return db
    .select({
      tierId: claim.tierId,
      claimed: sql<number>`COUNT(*)::int`,
    })
    .from(claim)
    .where(
      and(
        eq(claim.tournamentId, tournamentId),
        inArray(claim.status, ['pending', 'confirmed']),
      ),
    )
    .groupBy(claim.tierId);
}

export async function getPlayerScoreForMatch(
  db: Database,
  matchId: number,
  playerId: number,
) {
  const rows = await db
    .select()
    .from(playerScore)
    .where(and(eq(playerScore.matchId, matchId), eq(playerScore.playerId, playerId)))
    .limit(1);
  return rows[0];
}
