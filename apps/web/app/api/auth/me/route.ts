import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { user } from "@boundaryline/db";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const database = db();
    const [row] = await database
      .select({
        avatarUrl: user.avatarUrl,
        username: user.username,
        wallet: user.wallet,
      })
      .from(user)
      .where(eq(user.wallet, auth.claims.sub))
      .limit(1);

    if (!row) {
      return internalError("User row not found");
    }

    return NextResponse.json({
      user: {
        avatarUrl: row.avatarUrl,
        username: row.username ?? "",
        wallet: row.wallet,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load auth profile: ${msg}`);
  }
}
