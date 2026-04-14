ALTER TABLE "user" RENAME COLUMN "display_name" TO "username";--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_key" ON "user" USING btree ("username");
