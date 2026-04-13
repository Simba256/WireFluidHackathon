import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be ≥32 chars"),
  SIWE_DOMAIN: z.string().min(1),
  SIWE_URL: z.string().url(),
  ADMIN_API_KEY: z.string().min(16),
  SIGNER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "SIGNER_PRIVATE_KEY must be 0x + 64 hex"),
  NEXT_PUBLIC_CHAIN_ID: z.string().regex(/^\d+$/),
  NEXT_PUBLIC_PSL_POINTS_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .or(z.literal("")),
  NEXT_PUBLIC_PSL_TROPHIES_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .or(z.literal("")),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
