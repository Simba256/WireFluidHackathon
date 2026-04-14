import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { claim, getActiveTournamentId } from "@boundaryline/db";
import { TIERS_BY_ID, type TierId } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";
import { expireStaleClaims } from "@/lib/prize-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);
    await expireStaleClaims(database, tournamentId, wallet);

    const [row] = await database
      .select()
      .from(claim)
      .where(
        and(
          eq(claim.wallet, wallet),
          eq(claim.tournamentId, tournamentId),
          sql`${claim.status} IN ('pending', 'confirmed')`,
        ),
      )
      .orderBy(desc(claim.createdAt))
      .limit(1);

    if (!row) return NextResponse.json({ claim: null });

    const tier = TIERS_BY_ID[row.tierId as TierId];
    return NextResponse.json({
      claim: {
        tierId: row.tierId,
        tierName: tier?.name ?? null,
        tierDisplayName: tier?.displayName ?? null,
        status: row.status,
        txHash: row.txHash,
        tokenId: row.trophyTokenId != null ? Number(row.trophyTokenId) : null,
        claimedAt: (row.confirmedAt ?? row.createdAt).toISOString(),
        fulfillmentStatus: row.fulfillmentStatus,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load claim status: ${msg}`);
  }
}
