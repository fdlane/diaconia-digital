CREATE TYPE "public"."group_position" AS ENUM('president', 'secretary', 'treasurer');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'chaplain';--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "position" "group_position";--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "chaplain_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "chaplain_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_chaplain_id_users_id_fk" FOREIGN KEY ("chaplain_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_chaplain_id_users_id_fk" FOREIGN KEY ("chaplain_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendees_group_position_idx" ON "attendees" USING btree ("group_id","position") WHERE "attendees"."position" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "groups_chaplain_id_idx" ON "groups" USING btree ("chaplain_id");--> statement-breakpoint
CREATE INDEX "sessions_chaplain_id_idx" ON "sessions" USING btree ("chaplain_id");