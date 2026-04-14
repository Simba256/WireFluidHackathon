import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { getActiveTournamentId, userPoint } from "@boundaryline/db";
import { type DashboardGlobalDTO } from "@boundaryline/shared";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";
import { rankPercentile } from "@/lib/prize-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const [rankRow, totalRow] = await Promise.all([
      database
        .select({
          rank: sql<number>`(
            SELECT COUNT(*)::int + 1 FROM ${userPoint} up2
            WHERE up2.tournament_id = ${tournamentId}
              AND up2.total_points > ${userPoint.totalPoints}
          )`.as("rank"),
        })
        .from(userPoint)
        .where(
          and(
            eq(userPoint.wallet, wallet),
            eq(userPoint.tournamentId, tournamentId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(userPoint)
        .where(
          and(
            eq(userPoint.tournamentId, tournamentId),
            gt(userPoint.totalPoints, 0n),
          ),
        )
        .then((rows) => rows[0]),
    ]);

    const rank = rankRow?.rank ?? null;
    const totalPlayers = totalRow?.count ?? 0;

    return NextResponse.json({
      global: {
        rank,
        totalPlayers,
        percentile: rankPercentile(rank, totalPlayers),
      },
    } satisfies DashboardGlobalDTO);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load dashboard global standing: ${msg}`);
  }
}
