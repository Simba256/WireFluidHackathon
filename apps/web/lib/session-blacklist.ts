// In-memory session blacklist. Acceptable for hackathon single-instance Vercel
// Fluid Compute runtime; swap for Redis/KV if we ever horizontally scale.
const revoked = new Set<string>();

export function revokeJti(jti: string): void {
  revoked.add(jti);
}

export function isRevoked(jti: string): boolean {
  return revoked.has(jti);
}
