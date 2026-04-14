import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getActiveTournamentId, siweNonce, user, userPoint } from "@boundaryline/db";
import { SiweMessage } from "siwe";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { verifySiwe } from "@/lib/siwe";
import { issueSessionToken } from "@/lib/jwt";
import {
  badRequest,
  errorResponse,
  internalError,
  zodToResponse,
} from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "signature must be 0x hex"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return zodToResponse(parsed.error);
    body = parsed.data;
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  let messageNonce: string;
  try {
    messageNonce = new SiweMessage(body.message).nonce;
  } catch {
    return errorResponse(
      API_ERROR_CODES.SIWE_INVALID,
      "Malformed SIWE message",
      401,
    );
  }

  const database = db();

  // Atomic single-use consumption: only succeeds if the nonce exists, hasn't
  // been consumed, and hasn't expired. Any other outcome is NONCE_MISMATCH.
  const consumed = await database
    .update(siweNonce)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(siweNonce.nonce, messageNonce),
        isNull(siweNonce.consumedAt),
        gt(siweNonce.expiresAt, new Date()),
      ),
    )
    .returning({ nonce: siweNonce.nonce });

  if (consumed.length === 0) {
    return badRequest(
      API_ERROR_CODES.NONCE_MISMATCH,
      "Nonce unknown, expired, or already used",
    );
  }

  let verified;
  try {
    const requestHost =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      undefined;
    verified = await verifySiwe(body.message, body.signature, requestHost);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return errorResponse(API_ERROR_CODES.SIWE_INVALID, msg, 401);
  }

  try {
    const existing = await database
      .select({
        wallet: user.wallet,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })
      .from(user)
      .where(eq(user.wallet, verified.address))
      .limit(1);

    let isNewUser = false;

    if (existing.length === 0) {
      await database.insert(user).values({ wallet: verified.address });
      const tournamentId = await getActiveTournamentId(database);
      await database
        .insert(userPoint)
        .values({ wallet: verified.address, tournamentId, totalPoints: 0n })
        .onConflictDoNothing();
      isNewUser = true;
    } else {
      await database
        .update(user)
        .set({ updatedAt: sql`now()` })
        .where(eq(user.wallet, verified.address));
    }

    const token = await issueSessionToken(verified.address);

    return NextResponse.json({
      token,
      isNewUser,
      user: {
        wallet: verified.address,
        username: existing[0]?.username ?? "",
        avatarUrl: existing[0]?.avatarUrl ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Auth verify failed: ${msg}`);
  }
}
