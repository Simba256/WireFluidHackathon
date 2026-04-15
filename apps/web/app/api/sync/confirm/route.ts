import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { getActiveTournamentId, syncedRecord } from "@boundaryline/db";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { badRequest, internalError, zodToResponse } from "@/lib/errors";
import { invalidatePrizeStateCache } from "@/lib/prize-state";
import { invalidateDashboardMeCache } from "@/app/api/dashboard/me/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  blockNumber: z.string().regex(/^\d+$/),
  nonce: z.string().regex(/^\d+$/),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
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

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const [record] = await database
      .select({ id: syncedRecord.id })
      .from(syncedRecord)
      .where(
        and(
          eq(syncedRecord.wallet, wallet),
          eq(syncedRecord.tournamentId, tournamentId),
          eq(syncedRecord.status, "pending"),
          eq(syncedRecord.nonce, body.nonce),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json({ confirmed: false });
    }

    await database
      .update(syncedRecord)
      .set({
        status: "confirmed",
        txHash: body.txHash,
        blockNumber: BigInt(body.blockNumber),
        confirmedAt: new Date(),
      })
      .where(eq(syncedRecord.id, record.id));

    invalidatePrizeStateCache();
    invalidateDashboardMeCache(wallet);

    return NextResponse.json({ confirmed: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to confirm sync: ${msg}`);
  }
}
