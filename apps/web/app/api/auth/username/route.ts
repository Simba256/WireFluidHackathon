import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { user } from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  badRequest,
  errorResponse,
  internalError,
  zodToResponse,
} from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const bodySchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(USERNAME_REGEX, "Letters, numbers, and underscores only"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return zodToResponse(parsed.error);
    body = parsed.data;
  } catch {
    return badRequest(API_ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  try {
    const database = db();

    const [existing] = await database
      .select({ username: user.username })
      .from(user)
      .where(eq(user.wallet, wallet))
      .limit(1);

    if (!existing) return internalError("User row not found");

    if (existing.username) {
      return errorResponse(
        API_ERROR_CODES.USERNAME_ALREADY_SET,
        "Username has already been set and cannot be changed",
        409,
      );
    }

    const lowered = body.username.toLowerCase();

    const updated = await database
      .update(user)
      .set({ username: lowered })
      .where(eq(user.wallet, wallet))
      .returning({ username: user.username });

    if (updated.length === 0) return internalError("Failed to set username");

    return NextResponse.json({ username: updated[0]!.username });
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("user_username_key")
    ) {
      return errorResponse(
        API_ERROR_CODES.USERNAME_TAKEN,
        "That username is already taken",
        409,
      );
    }
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to set username: ${msg}`);
  }
}
