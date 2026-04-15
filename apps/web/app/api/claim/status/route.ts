import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { claim, getActiveTournamentId } from "@boundaryline/db";
import {
  CONTRACT_ADDRESSES,
  PSLPointsAbi,
  TIERS_BY_ID,
  fromContractTierId,
  type TierId,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";
import { expireStaleClaims, invalidatePrizeStateCache } from "@/lib/prize-state";
import { invalidateTrophiesCache } from "@/app/api/trophies/[wallet]/route";
import { invalidateDashboardMeCache } from "@/app/api/dashboard/me/route";
import { publicClient } from "@/lib/viem";

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

    // Lazy-reconcile: if a TierClaimed event exists on-chain but the matching
    // claim row is still pending/expired (backend observer missed the event),
    // patch the row to confirmed so the UI recovers automatically.
    try {
      const client = publicClient();
      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestBlock > 9000n ? latestBlock - 9000n : 0n;
      const logs = await client.getContractEvents({
        address: CONTRACT_ADDRESSES.PSLPoints,
        abi: PSLPointsAbi,
        eventName: "TierClaimed",
        args: { user: wallet as Address },
        fromBlock,
        toBlock: latestBlock,
      });
      if (logs.length > 0) {
        invalidatePrizeStateCache();
        invalidateTrophiesCache(wallet);
        invalidateDashboardMeCache(wallet);
      }
      for (const log of logs) {
        const args = log.args as {
          tierId?: number;
          trophyTokenId?: bigint;
          burnedAmount?: bigint;
        };
        if (args.tierId == null || args.trophyTokenId == null) continue;
        // Event carries contract-space tierId; translate back to backend space.
        const backendTierId = fromContractTierId(Number(args.tierId));
        await database
          .update(claim)
          .set({
            status: "confirmed",
            trophyTokenId: args.trophyTokenId,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            confirmedAt: sql`now()`,
          })
          .where(
            and(
              eq(claim.wallet, wallet),
              eq(claim.tierId, backendTierId),
              inArray(claim.status, ["pending", "expired"]),
              isNull(claim.trophyTokenId),
            ),
          );
      }
    } catch {
      // swallow — best-effort reconciliation
    }

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
