import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getActiveTournamentId, user } from "@boundaryline/db";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";
import { getPrizeLeaderboardState } from "@/lib/prize-state";

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
    const prizeState = await getPrizeLeaderboardState(database, tournamentId);
    const paged = prizeState.entries.slice(offset, offset + limit);

    const wallets = paged.map((e) => e.wallet);
    const userRows =
      wallets.length > 0
        ? await database
            .select({
              wallet: user.wallet,
              username: user.username,
              avatarUrl: user.avatarUrl,
            })
            .from(user)
            .where(inArray(user.wallet, wallets))
        : [];
    const userMap = new Map(userRows.map((u) => [u.wallet, u]));

    const entries = paged.map((entry) => {
      const u = userMap.get(entry.wallet);
      return {
        rank: entry.rank,
        wallet: entry.wallet,
        username: u?.username ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        walletBalance: entry.walletBalance.toString(),
        earnedBalance: entry.earnedBalance.toString(),
        tierEligible: entry.tier?.name ?? null,
        canClaim: entry.canClaim,
      };
    });

    return NextResponse.json({
      entries,
      totalQualified: prizeState.totalQualified,
      snapshotBlock: prizeState.snapshotBlock,
      updatedAt: prizeState.updatedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load prize leaderboard: ${msg}`);
  }
}
