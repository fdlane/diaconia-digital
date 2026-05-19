import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["facilitator", "admin"]);
export const attendanceStatus = pgEnum("attendance_status", ["present", "absent", "excused"]);
export const prayerRequestStatus = pgEnum("prayer_request_status", ["open", "answered", "archived"]);
export const followUpCategory = pgEnum("follow_up_category", [
  "none",
  "financial",
  "training",
  "wellbeing",
  "documentation",
  "other",
]);
export const mediaAssetType = pgEnum("media_asset_type", [
  "user_profile_photo",
  "attendee_profile_photo",
  "meeting_photo",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cognitoSub: text("cognito_sub").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    role: userRole("role").notNull().default("facilitator"),
    profilePhotoMediaId: uuid("profile_photo_media_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cognitoSubIdx: uniqueIndex("users_cognito_sub_idx").on(table.cognitoSub),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    community: text("community").notNull(),
    facilitatorId: uuid("facilitator_id")
      .notNull()
      .references(() => users.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    facilitatorIdx: index("groups_facilitator_id_idx").on(table.facilitatorId),
  }),
);

export const attendees = pgTable(
  "attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    displayName: text("display_name").notNull(),
    phone: text("phone"),
    profilePhotoMediaId: uuid("profile_photo_media_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("attendees_group_id_idx").on(table.groupId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    facilitatorId: uuid("facilitator_id")
      .notNull()
      .references(() => users.id),
    heldAt: timestamp("held_at", { withTimezone: true }).notNull(),
    notes: text("notes").notNull().default(""),
    followUpCategory: followUpCategory("follow_up_category").notNull().default("none"),
    followUpNotes: text("follow_up_notes").notNull().default(""),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupHeldAtIdx: index("sessions_group_held_at_idx").on(table.groupId, table.heldAt),
    facilitatorIdx: index("sessions_facilitator_id_idx").on(table.facilitatorId),
  }),
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    attendeeId: uuid("attendee_id")
      .notNull()
      .references(() => attendees.id),
    status: attendanceStatus("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionAttendeeIdx: uniqueIndex("attendance_session_attendee_idx").on(
      table.sessionId,
      table.attendeeId,
    ),
  }),
);

export const prayerRequests = pgTable(
  "prayer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    attendeeId: uuid("attendee_id").references(() => attendees.id),
    requesterName: text("requester_name").notNull(),
    request: text("request").notNull(),
    status: prayerRequestStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("prayer_requests_session_id_idx").on(table.sessionId),
    attendeeIdx: index("prayer_requests_attendee_id_idx").on(table.attendeeId),
  }),
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: mediaAssetType("type").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    attendeeId: uuid("attendee_id").references(() => attendees.id),
    sessionId: uuid("session_id").references(() => sessions.id),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    checksumSha256: text("checksum_sha256"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    objectKeyIdx: uniqueIndex("media_assets_object_key_idx").on(table.objectKey),
    sessionIdx: index("media_assets_session_id_idx").on(table.sessionId),
    attendeeIdx: index("media_assets_attendee_id_idx").on(table.attendeeId),
    positiveByteSize: check("media_assets_positive_byte_size", sql`${table.byteSize} >= 0`),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entityIdx: index("audit_events_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_events_actor_idx").on(table.actorUserId),
  }),
);
