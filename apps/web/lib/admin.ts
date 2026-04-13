import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "./env";
import { unauthorized } from "./errors";

export type AdminResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export function requireAdmin(req: NextRequest): AdminResult {
  const provided = req.headers.get("x-admin-key");
  if (!provided || provided !== serverEnv().ADMIN_API_KEY) {
    return { ok: false, response: unauthorized("Invalid admin key") };
  }
  return { ok: true };
}
