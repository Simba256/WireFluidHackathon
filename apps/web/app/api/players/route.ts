import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { player } from "@boundaryline/db";
import { db } from "@/lib/db";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
// Player catalog is static for the tournament duration. Next will serve from
// the data cache on repeat hits within the revalidate window.
export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await db()
      .select({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        basePrice: player.basePrice,
        photoUrl: player.photoUrl,
      })
      .from(player)
      .where(eq(player.active, true))
      .orderBy(player.team, player.name);

    return NextResponse.json(
      { players: rows },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load players: ${msg}`);
  }
}
