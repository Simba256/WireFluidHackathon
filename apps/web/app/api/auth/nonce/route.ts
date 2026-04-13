import { NextResponse } from "next/server";
import { newNonce } from "@/lib/siwe";
import { NONCE_COOKIE, NONCE_COOKIE_MAX_AGE } from "@/lib/auth-cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const nonce = newNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set({
    name: NONCE_COOKIE,
    value: nonce,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NONCE_COOKIE_MAX_AGE,
  });
  return res;
}
