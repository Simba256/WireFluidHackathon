import { NextRequest, NextResponse } from "next/server";
import { getActiveTournamentId } from "@boundaryline/db";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";
import { getPrizeLeaderboardState } from "@/lib/prize-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazy read: fetch the distinct wallet set from synced_record (everyone who's
// ever touched sync is tracked), multicall balanceOf + earnedBalance, filter
// qualified, rank by balanceOf DESC. Full indexer-driven Transfer log scan is
// v2 (see BUILD_CHECKLIST §9).
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
    const entries = paged.map((entry) => ({
      rank: entry.rank,
      wallet: entry.wallet,
      walletBalance: entry.walletBalance.toString(),
      earnedBalance: entry.earnedBalance.toString(),
      tierEligible: entry.tier?.name ?? null,
      canClaim: entry.canClaim,
    }));

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
