import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";
import { revokeJti } from "@/lib/session-blacklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    try {
      const claims = await verifySessionToken(token);
      revokeJti(claims.jti);
    } catch {
      // Swallow: a bad token on logout is a no-op.
    }
  }
  return new NextResponse(null, { status: 204 });
}
