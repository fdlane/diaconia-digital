CREATE TYPE "public"."prayer_request_status" AS ENUM('open', 'answered', 'archived');--> statement-breakpoint
CREATE TABLE "prayer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"attendee_id" uuid,
	"requester_name" text NOT NULL,
	"request" text NOT NULL,
	"status" "prayer_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prayer_requests_session_id_idx" ON "prayer_requests" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "prayer_requests_attendee_id_idx" ON "prayer_requests" USING btree ("attendee_id");