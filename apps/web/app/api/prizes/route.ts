import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  getActiveTournamentId,
  getTierStockClaimed,
  prize,
} from "@boundaryline/db";
import { TIERS_BY_ID, type TierId } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const prizeRows = await database
      .select()
      .from(prize)
      .where(eq(prize.tournamentId, tournamentId));

    const stockClaimed = await getTierStockClaimed(database, tournamentId);
    const claimedByTier = new Map<number, number>(
      stockClaimed.map((r) => [r.tierId, r.claimed]),
    );

    const tiers = prizeRows.map((p) => {
      const tier = TIERS_BY_ID[p.tierId as TierId];
      const claimed = claimedByTier.get(p.tierId) ?? 0;
      return {
        tierId: p.tierId,
        name: tier?.name ?? null,
        displayName: tier?.displayName ?? p.name,
        rankRequired: p.rankRequired,
        stock: p.stockLimit,
        claimed,
        remaining: Math.max(0, p.stockLimit - claimed),
        prize: {
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
        },
      };
    });

    return NextResponse.json({ tiers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load prizes: ${msg}`);
  }
}
