CREATE TABLE "admin_session" (
	"token" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"tournament_id" integer NOT NULL,
	"tier_id" smallint NOT NULL,
	"nonce" numeric(78, 0) NOT NULL,
	"tx_hash" text,
	"block_number" bigint,
	"status" text NOT NULL,
	"voucher_expires_at" timestamp with time zone NOT NULL,
	"trophy_token_id" bigint,
	"fulfillment_status" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "wallet_lowercase_hex" CHECK (wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"team_a" text NOT NULL,
	"team_b" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"played_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"team" text NOT NULL,
	"role" text NOT NULL,
	"base_price" integer NOT NULL,
	"photo_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_score" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"wickets" integer DEFAULT 0 NOT NULL,
	"catches" integer DEFAULT 0 NOT NULL,
	"run_outs" integer DEFAULT 0 NOT NULL,
	"stumpings" integer DEFAULT 0 NOT NULL,
	"dismissed_for_zero" boolean DEFAULT false NOT NULL,
	"points_awarded" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prize" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"tier_id" smallint NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"stock_limit" integer NOT NULL,
	"rank_required" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prize_leaderboard_snapshot" (
	"wallet" text NOT NULL,
	"tournament_id" integer NOT NULL,
	"earned_balance" numeric(78, 0) NOT NULL,
	"rank" integer NOT NULL,
	"snapshot_block" bigint NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prize_leaderboard_snapshot_wallet_tournament_id_pk" PRIMARY KEY("wallet","tournament_id"),
	CONSTRAINT "wallet_lowercase_hex" CHECK (wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "synced_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"tournament_id" integer NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"nonce" numeric(78, 0) NOT NULL,
	"tx_hash" text,
	"block_number" bigint,
	"status" text NOT NULL,
	"voucher_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "wallet_lowercase_hex" CHECK (wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_wallet" text NOT NULL,
	"tournament_id" integer NOT NULL,
	"total_credits" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallet_lowercase_hex" CHECK (user_wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "team_player" (
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "team_player_team_id_player_id_pk" PRIMARY KEY("team_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "tournament" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"grace_ends" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"wallet" text PRIMARY KEY NOT NULL,
	"siwe_nonce" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_lowercase_hex" CHECK (wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "user_point" (
	"wallet" text NOT NULL,
	"tournament_id" integer NOT NULL,
	"total_points" bigint DEFAULT 0 NOT NULL,
	"last_match_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_point_wallet_tournament_id_pk" PRIMARY KEY("wallet","tournament_id"),
	CONSTRAINT "wallet_lowercase_hex" CHECK (wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
ALTER TABLE "player_score" ADD CONSTRAINT "player_score_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_score" ADD CONSTRAINT "player_score_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_user_wallet_user_wallet_fk" FOREIGN KEY ("user_wallet") REFERENCES "public"."user"("wallet") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_player" ADD CONSTRAINT "team_player_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_player" ADD CONSTRAINT "team_player_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "claim_nonce_key" ON "claim" USING btree ("nonce");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_active_wallet_tournament_key" ON "claim" USING btree ("wallet","tournament_id") WHERE status IN ('pending', 'confirmed');--> statement-breakpoint
CREATE INDEX "claim_tier_status_idx" ON "claim" USING btree ("tier_id","status");--> statement-breakpoint
CREATE INDEX "match_tournament_status_idx" ON "match" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "player_external_id_key" ON "player" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "player_team_idx" ON "player" USING btree ("team");--> statement-breakpoint
CREATE INDEX "player_role_idx" ON "player" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "player_score_match_player_key" ON "player_score" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE INDEX "player_score_player_idx" ON "player_score" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prize_tournament_tier_key" ON "prize" USING btree ("tournament_id","tier_id");--> statement-breakpoint
CREATE INDEX "prize_leaderboard_rank_idx" ON "prize_leaderboard_snapshot" USING btree ("tournament_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "synced_record_nonce_key" ON "synced_record" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "synced_record_wallet_tournament_idx" ON "synced_record" USING btree ("wallet","tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_user_tournament_key" ON "team" USING btree ("user_wallet","tournament_id");--> statement-breakpoint
CREATE INDEX "team_player_player_idx" ON "team_player" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "user_point_leaderboard_idx" ON "user_point" USING btree ("tournament_id","total_points" DESC NULLS LAST);