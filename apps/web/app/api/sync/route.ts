import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import {
  claim,
  getActiveTournamentId,
  syncedRecord,
  userPoint,
} from "@boundaryline/db";
import {
  API_ERROR_CODES,
  BNDY_DECIMALS,
  VOUCHER_TTL_SECONDS,
} from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { badRequest, internalError } from "@/lib/errors";
import { readEarnedBalance } from "@/lib/viem";
import { generateNonce, signSyncVoucher } from "@/lib/voucher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    // Release any stale pending records so their amount becomes eligible again.
    await database
      .update(syncedRecord)
      .set({ status: "expired" })
      .where(
        and(
          eq(syncedRecord.wallet, wallet),
          eq(syncedRecord.status, "pending"),
          sql`${syncedRecord.voucherExpiresAt} < now()`,
        ),
      );

    const [pointRow] = await database
      .select({ totalPoints: userPoint.totalPoints })
      .from(userPoint)
      .where(
        and(
          eq(userPoint.wallet, wallet),
          eq(userPoint.tournamentId, tournamentId),
        ),
      )
      .limit(1);

    const totalEarnedPoints = pointRow?.totalPoints ?? 0n;
    const totalEarnedWei = totalEarnedPoints * 10n ** BigInt(BNDY_DECIMALS);

    const onChainEarned = await readEarnedBalance(wallet as Address);

    // Subtract any active pending vouchers to prevent double-counting.
    const [pendingSum] = await database
      .select({
        sum: sql<string>`COALESCE(SUM(${syncedRecord.amount}::numeric), 0)::text`,
      })
      .from(syncedRecord)
      .where(
        and(
          eq(syncedRecord.wallet, wallet),
          eq(syncedRecord.status, "pending"),
        ),
      );

    const pendingWei = BigInt(pendingSum?.sum ?? "0");

    // Subtract prior confirmed claims — earnedBalance was burned on-chain so
    // the lifetime total_points still holds that amount but it must not be
    // re-synced into a new sync voucher.
    const [claimedRow] = await database
      .select({
        total: sql<string>`COALESCE(SUM(${claim.earnedAtClaim}), 0)::text`,
      })
      .from(claim)
      .where(
        and(
          eq(claim.wallet, wallet),
          eq(claim.tournamentId, tournamentId),
          eq(claim.status, "confirmed"),
        ),
      );
    const claimedEarnedWei = BigInt(claimedRow?.total ?? "0");
    const consumedWei = onChainEarned + pendingWei + claimedEarnedWei;
    const delta = totalEarnedWei > consumedWei ? totalEarnedWei - consumedWei : 0n;

    if (delta <= 0n) {
      return badRequest(API_ERROR_CODES.NOTHING_TO_SYNC, "No points to sync");
    }

    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + VOUCHER_TTL_SECONDS * 1000);

    const voucher = {
      user: wallet as Address,
      amount: delta,
      nonce,
    };
    const signature = await signSyncVoucher(voucher);

    await database.insert(syncedRecord).values({
      wallet,
      tournamentId,
      amount: delta.toString(),
      nonce: nonce.toString(),
      status: "pending",
      voucherExpiresAt: expiresAt,
    });

    return NextResponse.json({
      voucher: {
        user: voucher.user,
        amount: voucher.amount.toString(),
        nonce: voucher.nonce.toString(),
      },
      signature,
      expiresAt: expiresAt.toISOString(),
      estimatedGas: "70000",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to create sync voucher: ${msg}`);
  }
}
