import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { siweNonce } from "@boundaryline/db";
import { db } from "@/lib/db";
import { newNonce } from "@/lib/siwe";
import { internalError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_TTL_MS = 10 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  try {
    const database = db();
    const nonce = newNonce();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + NONCE_TTL_MS);

    // Opportunistic sweep: drop nonces that expired >5 minutes ago. Cheap, lazy,
    // avoids cron. Row count here is tiny (one per /nonce call).
    const cutoff = new Date(now.getTime() - 5 * 60 * 1000);
    await database.delete(siweNonce).where(lt(siweNonce.expiresAt, cutoff));

    await database.insert(siweNonce).values({ nonce, expiresAt });

    return NextResponse.json({ nonce });
  } catch {
    return internalError("Failed to issue nonce");
  }
}
