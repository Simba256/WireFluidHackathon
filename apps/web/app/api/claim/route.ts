import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import {
  claim,
  getActiveTournamentId,
  getTierStockClaimed,
  prize,
  userPoint,
} from "@boundaryline/db";
import {
  API_ERROR_CODES,
  MIN_EARNED_TO_CLAIM_WEI,
  TIERS_BY_ID,
  VOUCHER_TTL_SECONDS,
  tierForRank,
  type TierId,
} from "@boundaryline/shared";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  badRequest,
  errorResponse,
  internalError,
  zodToResponse,
} from "@/lib/errors";
import { readEarnedBalance } from "@/lib/viem";
import { generateNonce, signClaimVoucher } from "@/lib/voucher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tierId: z.number().int().min(1).max(5),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return zodToResponse(parsed.error);
    body = parsed.data;
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const tierId = body.tierId as TierId;
  const tier = TIERS_BY_ID[tierId];
  if (!tier) {
    return badRequest(API_ERROR_CODES.WRONG_TIER, "Unknown tier");
  }

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const earned = await readEarnedBalance(wallet as Address);
    if (earned < MIN_EARNED_TO_CLAIM_WEI) {
      return badRequest(
        API_ERROR_CODES.BELOW_THRESHOLD,
        "Below 10,000 BNDY earned minimum",
      );
    }

    const [pointRow] = await database
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
      .limit(1);

    const rank = pointRow?.rank;
    if (!rank) {
      return errorResponse(API_ERROR_CODES.NO_TEAM, "No points recorded", 400);
    }

    const eligibleTier = tierForRank(rank);
    if (!eligibleTier || eligibleTier.id !== tierId) {
      return badRequest(
        API_ERROR_CODES.WRONG_TIER,
        `Not in tier band ${tier.displayName}`,
      );
    }

    const [existing] = await database
      .select({ id: claim.id })
      .from(claim)
      .where(
        and(
          eq(claim.wallet, wallet),
          eq(claim.tournamentId, tournamentId),
          sql`${claim.status} IN ('pending', 'confirmed')`,
        ),
      )
      .limit(1);
    if (existing) {
      return errorResponse(
        API_ERROR_CODES.ALREADY_CLAIMED,
        "Already claimed this tournament",
        409,
      );
    }

    const stockClaimed = await getTierStockClaimed(database, tournamentId);
    const taken = stockClaimed.find((r) => r.tierId === tierId)?.claimed ?? 0;
    if (taken >= tier.stockLimit) {
      return errorResponse(API_ERROR_CODES.NO_STOCK, "Tier out of stock", 409);
    }

    const [prizeRow] = await database
      .select()
      .from(prize)
      .where(
        and(eq(prize.tournamentId, tournamentId), eq(prize.tierId, tierId)),
      )
      .limit(1);

    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + VOUCHER_TTL_SECONDS * 1000);

    try {
      await database.insert(claim).values({
        wallet,
        tournamentId,
        tierId,
        nonce: nonce.toString(),
        status: "pending",
        voucherExpiresAt: expiresAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg.includes("claim_active_wallet_tournament_key")) {
        return errorResponse(
          API_ERROR_CODES.ALREADY_CLAIMED,
          "Already claimed this tournament",
          409,
        );
      }
      throw err;
    }

    const voucher = {
      user: wallet as Address,
      tierId: Number(tierId),
      nonce,
    };
    const signature = await signClaimVoucher(voucher);

    return NextResponse.json({
      voucher: {
        user: voucher.user,
        tierId: voucher.tierId,
        nonce: voucher.nonce.toString(),
      },
      signature,
      expiresAt: expiresAt.toISOString(),
      estimatedGas: "120000",
      prize: prizeRow
        ? {
            name: prizeRow.name,
            description: prizeRow.description,
            imageUrl: prizeRow.imageUrl,
          }
        : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to create claim voucher: ${msg}`);
  }
}
