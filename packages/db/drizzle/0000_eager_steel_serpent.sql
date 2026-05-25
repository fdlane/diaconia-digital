CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'excused');--> statement-breakpoint
CREATE TYPE "public"."follow_up_category" AS ENUM('none', 'financial', 'training', 'wellbeing', 'documentation', 'other');--> statement-breakpoint
CREATE TYPE "public"."group_position" AS ENUM('president', 'secretary', 'treasurer');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."location_source" AS ENUM('manual', 'device', 'imported');--> statement-breakpoint
CREATE TYPE "public"."media_asset_type" AS ENUM('user_profile_photo', 'group_profile_photo', 'meeting_photo');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."prayer_request_status" AS ENUM('open', 'answered', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'facilitator', 'chaplain', 'member');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" "group_position",
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"community" text NOT NULL,
	"facilitator_id" uuid NOT NULL,
	"chaplain_user_id" uuid,
	"profile_photo_media_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"invited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"type" "media_asset_type" NOT NULL,
	"owner_user_id" uuid,
	"group_id" uuid,
	"meeting_id" uuid,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum_sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_positive_byte_size" CHECK ("media_assets"."byte_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meeting_attendance" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"group_id" uuid NOT NULL,
	"facilitator_id" uuid NOT NULL,
	"chaplain_user_id" uuid,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone,
	"occurred_at" timestamp with time zone,
	"status" "meeting_status" DEFAULT 'scheduled' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"location_name" text,
	"address" text,
	"location_captured_at" timestamp with time zone,
	"location_source" "location_source",
	"notes" text DEFAULT '' NOT NULL,
	"follow_up_category" "follow_up_category" DEFAULT 'none' NOT NULL,
	"follow_up_notes" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_valid_latitude" CHECK ("meetings"."latitude" IS NULL OR ("meetings"."latitude" >= -90 AND "meetings"."latitude" <= 90)),
	CONSTRAINT "meetings_valid_longitude" CHECK ("meetings"."longitude" IS NULL OR ("meetings"."longitude" >= -180 AND "meetings"."longitude" <= 180))
);
--> statement-breakpoint
CREATE TABLE "prayer_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"request" text NOT NULL,
	"status" "prayer_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"auth_provider" text DEFAULT 'clerk' NOT NULL,
	"auth_subject" text,
	"display_name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"profile_photo_media_id" uuid,
	"invited_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_facilitator_id_users_id_fk" FOREIGN KEY ("facilitator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_chaplain_user_id_users_id_fk" FOREIGN KEY ("chaplain_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_facilitator_id_users_id_fk" FOREIGN KEY ("facilitator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_chaplain_user_id_users_id_fk" FOREIGN KEY ("chaplain_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_requests" ADD CONSTRAINT "prayer_requests_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "group_memberships_group_id_idx" ON "group_memberships" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_memberships_user_id_idx" ON "group_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_active_member_idx" ON "group_memberships" USING btree ("group_id","user_id") WHERE "group_memberships"."active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_active_position_idx" ON "group_memberships" USING btree ("group_id","position") WHERE "group_memberships"."active" = true AND "group_memberships"."position" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "groups_facilitator_id_idx" ON "groups" USING btree ("facilitator_id");--> statement-breakpoint
CREATE INDEX "groups_chaplain_user_id_idx" ON "groups" USING btree ("chaplain_user_id");--> statement-breakpoint
CREATE INDEX "invitations_user_id_idx" ON "invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitations_phone_idx" ON "invitations" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_idx" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_user_idx" ON "invitations" USING btree ("user_id") WHERE "invitations"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_idx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_owner_user_id_idx" ON "media_assets" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "media_assets_group_id_idx" ON "media_assets" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "media_assets_meeting_id_idx" ON "media_assets" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_attendance_meeting_user_idx" ON "meeting_attendance" USING btree ("meeting_id","user_id");--> statement-breakpoint
CREATE INDEX "meeting_attendance_user_id_idx" ON "meeting_attendance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meetings_group_scheduled_start_idx" ON "meetings" USING btree ("group_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "meetings_facilitator_id_idx" ON "meetings" USING btree ("facilitator_id");--> statement-breakpoint
CREATE INDEX "meetings_chaplain_user_id_idx" ON "meetings" USING btree ("chaplain_user_id");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prayer_requests_meeting_id_idx" ON "prayer_requests" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_provider_subject_idx" ON "users" USING btree ("auth_provider","auth_subject") WHERE "users"."auth_subject" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_phone_idx" ON "users" USING btree ("phone") WHERE "users"."status" <> 'disabled';--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email") WHERE "users"."email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");
