import { NextRequest, NextResponse } from "next/server";
import type { Address } from "viem";
import { requireAuth } from "@/lib/auth";
import { internalError } from "@/lib/errors";
import { readWalletBalance } from "@/lib/viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const wallet = auth.claims.sub;

  try {
    const walletBalance = await readWalletBalance(wallet as Address);
    return NextResponse.json({
      walletBalance: walletBalance.toString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return internalError(`Failed to load wallet balance: ${msg}`);
  }
}
