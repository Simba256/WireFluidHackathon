import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { user } from "@boundaryline/db";
import { API_ERROR_CODES } from "@boundaryline/shared";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { badRequest, internalError, zodToResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DATA_URL_BYTES = 150_000;

const bodySchema = z.object({
  avatarUrl: z
    .string()
    .max(MAX_DATA_URL_BYTES, "Avatar too large (max ~100KB)")
    .regex(
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
      "Must be a base64 data URL (png, jpeg, or webp)",
    ),
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

    const updated = await database
      .update(user)
      .set({ avatarUrl: body.avatarUrl })
      .where(eq(user.wallet, wallet))
      .returning({ avatarUrl: user.avatarUrl });

    if (updated.length === 0) return internalError("User not found");

    return NextResponse.json({ avatarUrl: updated[0]!.avatarUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to update avatar: ${msg}`);
  }
}
