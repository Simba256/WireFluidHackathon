import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { claim } from "@boundaryline/db";
import {
  API_ERROR_CODES,
  CONTRACT_ADDRESSES,
  PSLPointsAbi,
  PSLTrophiesAbi,
  TIERS_BY_ID,
  fromContractTierId,
  normalizeWallet,
  type TierId,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { badRequest, internalError } from "@/lib/errors";
import { publicClient } from "@/lib/viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ wallet: string }> },
): Promise<NextResponse> {
  const { wallet: raw } = await ctx.params;
  let wallet: string;
  try {
    wallet = normalizeWallet(raw);
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid wallet");
  }

  try {
    const database = db();
    const client = publicClient();

    const burnedByTokenId = new Map<string, string>();
    const tierClaimEvents: Array<{
      tierId: number;
      trophyTokenId: bigint;
      burnedAmount: bigint;
      txHash: `0x${string}`;
      blockNumber: bigint;
    }> = [];

    try {
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
      for (const log of logs) {
        const args = log.args as {
          tierId?: number;
          trophyTokenId?: bigint;
          burnedAmount?: bigint;
        };
        if (
          args.tierId != null &&
          args.trophyTokenId != null &&
          args.burnedAmount != null
        ) {
          burnedByTokenId.set(
            args.trophyTokenId.toString(),
            args.burnedAmount.toString(),
          );
          tierClaimEvents.push({
            // Event carries contract-space tierId; translate back to backend space.
            tierId: fromContractTierId(Number(args.tierId)),
            trophyTokenId: args.trophyTokenId,
            burnedAmount: args.burnedAmount,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }
      }
    } catch {
      // swallow — reconciliation and burnedAmount both gracefully degrade
    }

    // Lazy-reconcile: if a TierClaimed event exists on-chain but the matching
    // claim row is still pending/expired (backend observer missed it), patch
    // the row to confirmed so the trophy is visible again.
    for (const event of tierClaimEvents) {
      await database
        .update(claim)
        .set({
          status: "confirmed",
          trophyTokenId: event.trophyTokenId,
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          confirmedAt: sql`now()`,
        })
        .where(
          and(
            eq(claim.wallet, wallet),
            eq(claim.tierId, event.tierId),
            inArray(claim.status, ["pending", "expired"]),
            isNull(claim.trophyTokenId),
          ),
        );
    }

    const rows = await database
      .select()
      .from(claim)
      .where(
        and(
          eq(claim.wallet, wallet),
          eq(claim.status, "confirmed"),
          isNotNull(claim.trophyTokenId),
        ),
      );

    const trophies = await Promise.all(
      rows.map(async (row) => {
        const tier = TIERS_BY_ID[row.tierId as TierId];
        const tokenId = BigInt(row.trophyTokenId!);
        let tokenUri = "";
        try {
          tokenUri = (await client.readContract({
            address: CONTRACT_ADDRESSES.PSLTrophies,
            abi: PSLTrophiesAbi,
            functionName: "tokenURI",
            args: [tokenId],
          })) as string;
        } catch {
          // swallow — return empty tokenUri
        }
        return {
          tokenId: Number(tokenId),
          tierId: row.tierId,
          tierName: tier?.name ?? null,
          tournamentId: row.tournamentId,
          mintedAt: row.confirmedAt?.toISOString() ?? null,
          tokenUri,
          burnedAmount: burnedByTokenId.get(tokenId.toString()),
        };
      }),
    );

    return NextResponse.json({ wallet, trophies } satisfies {
      wallet: string;
      trophies: unknown[];
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load trophies: ${msg}`);
  }
}
