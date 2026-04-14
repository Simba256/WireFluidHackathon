import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getActiveTournamentId, syncedRecord } from "@boundaryline/db";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const database = db();
    const tournamentId = await getActiveTournamentId(database);

    const [pending] = await database
      .select({ id: syncedRecord.id })
      .from(syncedRecord)
      .where(
        and(
          eq(syncedRecord.wallet, wallet),
          eq(syncedRecord.tournamentId, tournamentId),
          eq(syncedRecord.status, "pending"),
        ),
      )
      .orderBy(desc(syncedRecord.createdAt))
      .limit(1);

    if (!pending) {
      return NextResponse.json({ cancelled: false });
    }

    await database
      .update(syncedRecord)
      .set({ status: "expired" })
      .where(eq(syncedRecord.id, pending.id));

    return NextResponse.json({ cancelled: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to cancel pending sync: ${msg}`);
  }
}
