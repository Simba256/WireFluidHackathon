import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});

const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be ≥32 chars"),
});

const siweEnvSchema = z.object({
  SIWE_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_CHAIN_ID: z.string().regex(/^\d+$/),
});

const adminEnvSchema = z.object({
  ADMIN_API_KEY: z.string().min(16),
});

const signerEnvSchema = z.object({
  SIGNER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "SIGNER_PRIVATE_KEY must be 0x + 64 hex"),
});

type SchemaValue<TSchema extends z.ZodTypeAny> = z.infer<TSchema>;

const cache = new Map<string, unknown>();

function parseEnv<TSchema extends z.ZodTypeAny>(
  key: string,
  schema: TSchema,
): SchemaValue<TSchema> {
  if (cache.has(key)) {
    return cache.get(key) as SchemaValue<TSchema>;
  }

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid ${key} environment: ${issues}`);
  }

  cache.set(key, parsed.data);
  return parsed.data;
}

export function databaseEnv(): SchemaValue<typeof databaseEnvSchema> {
  return parseEnv("database", databaseEnvSchema);
}

export function authEnv(): SchemaValue<typeof authEnvSchema> {
  return parseEnv("auth", authEnvSchema);
}

export function siweEnv(): SchemaValue<typeof siweEnvSchema> {
  return parseEnv("siwe", siweEnvSchema);
}

export function adminEnv(): SchemaValue<typeof adminEnvSchema> {
  return parseEnv("admin", adminEnvSchema);
}

export function signerEnv(): SchemaValue<typeof signerEnvSchema> {
  return parseEnv("signer", signerEnvSchema);
}
