import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "./env";

const ISSUER = "boundaryline";
const AUDIENCE = "boundaryline-web";
const SESSION_TTL = "7d";

export interface SessionClaims {
  sub: string; // wallet address (lowercase)
  jti: string; // unique token id for blacklist
}

function secret(): Uint8Array {
  return new TextEncoder().encode(serverEnv().AUTH_SECRET);
}

export async function issueSessionToken(wallet: string): Promise<string> {
  const jti = crypto.randomUUID();
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(wallet)
    .setJti(jti)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload.sub !== "string" || typeof payload.jti !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub: payload.sub, jti: payload.jti };
}
