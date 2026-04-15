CREATE TABLE "selected_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_wallet" text NOT NULL,
	"match_id" integer NOT NULL,
	"player_1" integer NOT NULL,
	"player_2" integer NOT NULL,
	"player_3" integer NOT NULL,
	"player_4" integer NOT NULL,
	"player_5" integer NOT NULL,
	"player_6" integer NOT NULL,
	"player_7" integer NOT NULL,
	"player_8" integer NOT NULL,
	"player_9" integer NOT NULL,
	"player_10" integer NOT NULL,
	"player_11" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallet_lowercase_hex" CHECK (user_wallet ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_user_wallet_user_wallet_fk" FOREIGN KEY ("user_wallet") REFERENCES "public"."user"("wallet") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_1_player_id_fk" FOREIGN KEY ("player_1") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_2_player_id_fk" FOREIGN KEY ("player_2") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_3_player_id_fk" FOREIGN KEY ("player_3") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_4_player_id_fk" FOREIGN KEY ("player_4") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_5_player_id_fk" FOREIGN KEY ("player_5") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_6_player_id_fk" FOREIGN KEY ("player_6") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_7_player_id_fk" FOREIGN KEY ("player_7") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_8_player_id_fk" FOREIGN KEY ("player_8") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_9_player_id_fk" FOREIGN KEY ("player_9") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_10_player_id_fk" FOREIGN KEY ("player_10") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_team" ADD CONSTRAINT "selected_team_player_11_player_id_fk" FOREIGN KEY ("player_11") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "selected_team_wallet_match_key" ON "selected_team" USING btree ("user_wallet","match_id");