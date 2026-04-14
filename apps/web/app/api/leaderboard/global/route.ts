import { NextRequest, NextResponse } from "next/server";
import { desc, eq, gt, sql } from "drizzle-orm";
import { getActiveTournamentId, user, userPoint } from "@boundaryline/db";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("limit") ?? 100)),
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const rows = await database
      .select({
        wallet: userPoint.wallet,
        totalPoints: userPoint.totalPoints,
        username: user.username,
        rank: sql<number>`RANK() OVER (ORDER BY ${userPoint.totalPoints} DESC)`.as(
          "rank",
        ),
      })
      .from(userPoint)
      .leftJoin(user, eq(user.wallet, userPoint.wallet))
      .where(eq(userPoint.tournamentId, tournamentId))
      .orderBy(desc(userPoint.totalPoints))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await database
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userPoint)
      .where(eq(userPoint.tournamentId, tournamentId));

    return NextResponse.json({
      entries: rows.map((r) => ({
        rank: Number(r.rank),
        wallet: r.wallet,
        username: r.username,
        totalPoints: Number(r.totalPoints),
      })),
      totalPlayers: totalRow?.count ?? 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load leaderboard: ${msg}`);
  }
}
