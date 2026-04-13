import { NextRequest } from "next/server";
import { verifySessionToken, type SessionClaims } from "./jwt";
import { isRevoked } from "./session-blacklist";
import { unauthorized } from "./errors";

export type AuthResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; response: ReturnType<typeof unauthorized> };

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, response: unauthorized("Missing bearer token") };
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const claims = await verifySessionToken(token);
    if (isRevoked(claims.jti)) {
      return { ok: false, response: unauthorized("Session revoked") };
    }
    return { ok: true, claims };
  } catch {
    return { ok: false, response: unauthorized("Invalid token") };
  }
}
