CREATE TABLE "siwe_nonce" (
	"nonce" text PRIMARY KEY NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "siwe_nonce_expires_at_idx" ON "siwe_nonce" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "siwe_nonce";