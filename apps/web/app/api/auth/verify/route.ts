import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { user } from "@boundaryline/db";
import { SiweMessage } from "siwe";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { verifySiwe } from "@/lib/siwe";
import { issueSessionToken } from "@/lib/jwt";
import { badRequest, errorResponse, internalError, zodToResponse } from "@/lib/errors";
import { NONCE_COOKIE } from "@/lib/auth-cookies";

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

  const cookieNonce = req.cookies.get(NONCE_COOKIE)?.value;
  if (!cookieNonce) {
    return badRequest(API_ERROR_CODES.NONCE_MISMATCH, "Missing nonce cookie");
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
  if (messageNonce !== cookieNonce) {
    return badRequest(API_ERROR_CODES.NONCE_MISMATCH, "Nonce mismatch");
  }

  let verified;
  try {
    verified = await verifySiwe(body.message, body.signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return errorResponse(API_ERROR_CODES.SIWE_INVALID, msg, 401);
  }

  try {
    const database = db();
    const rows = await database
      .insert(user)
      .values({ wallet: verified.address, siweNonce: verified.nonce })
      .onConflictDoUpdate({
        target: user.wallet,
        set: { siweNonce: verified.nonce, updatedAt: sql`now()` },
      })
      .returning({ wallet: user.wallet, createdAt: user.createdAt });

    const upserted = rows[0];
    if (!upserted) return internalError("Failed to upsert user");

    const token = await issueSessionToken(verified.address);

    const res = NextResponse.json({
      token,
      user: {
        wallet: upserted.wallet,
        createdAt: upserted.createdAt.toISOString(),
      },
    });
    res.cookies.delete(NONCE_COOKIE);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Auth verify failed: ${msg}`);
  }
}
