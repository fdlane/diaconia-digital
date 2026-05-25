import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "facilitator", "chaplain", "member"]);
export const userStatus = pgEnum("user_status", ["invited", "active", "disabled"]);
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);
export const groupPosition = pgEnum("group_position", ["president", "secretary", "treasurer"]);
export const meetingStatus = pgEnum("meeting_status", ["scheduled", "completed", "cancelled"]);
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
export const locationSource = pgEnum("location_source", ["manual", "device", "imported"]);
export const mediaAssetType = pgEnum("media_asset_type", [
  "user_profile_photo",
  "group_profile_photo",
  "meeting_photo",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    authProvider: text("auth_provider").notNull().default("clerk"),
    authSubject: text("auth_subject"),
    displayName: text("display_name").notNull(),
    email: text("email"),
    phone: text("phone").notNull(),
    role: userRole("role").notNull().default("member"),
    status: userStatus("status").notNull().default("invited"),
    profilePhotoMediaId: uuid("profile_photo_media_id"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    authSubjectIdx: uniqueIndex("users_auth_provider_subject_idx")
      .on(table.authProvider, table.authSubject)
      .where(sql`${table.authSubject} IS NOT NULL`),
    activePhoneIdx: uniqueIndex("users_active_phone_idx")
      .on(table.phone)
      .where(sql`${table.status} <> 'disabled'`),
    emailIdx: uniqueIndex("users_email_idx")
      .on(table.email)
      .where(sql`${table.email} IS NOT NULL`),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
  }),
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    phone: text("phone").notNull(),
    email: text("email"),
    tokenHash: text("token_hash").notNull(),
    status: invitationStatus("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("invitations_user_id_idx").on(table.userId),
    phoneIdx: index("invitations_phone_idx").on(table.phone),
    emailIdx: index("invitations_email_idx").on(table.email),
    tokenHashIdx: uniqueIndex("invitations_token_hash_idx").on(table.tokenHash),
    pendingUserIdx: uniqueIndex("invitations_pending_user_idx")
      .on(table.userId)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    name: text("name").notNull(),
    community: text("community").notNull(),
    facilitatorId: uuid("facilitator_id")
      .notNull()
      .references(() => users.id),
    chaplainUserId: uuid("chaplain_user_id").references(() => users.id),
    profilePhotoMediaId: uuid("profile_photo_media_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    facilitatorIdx: index("groups_facilitator_id_idx").on(table.facilitatorId),
    chaplainIdx: index("groups_chaplain_user_id_idx").on(table.chaplainUserId),
  }),
);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    position: groupPosition("position"),
    active: boolean("active").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("group_memberships_group_id_idx").on(table.groupId),
    userIdx: index("group_memberships_user_id_idx").on(table.userId),
    activeMemberIdx: uniqueIndex("group_memberships_active_member_idx")
      .on(table.groupId, table.userId)
      .where(sql`${table.active} = true`),
    activePositionIdx: uniqueIndex("group_memberships_active_position_idx")
      .on(table.groupId, table.position)
      .where(sql`${table.active} = true AND ${table.position} IS NOT NULL`),
  }),
);

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    facilitatorId: uuid("facilitator_id")
      .notNull()
      .references(() => users.id),
    chaplainUserId: uuid("chaplain_user_id").references(() => users.id),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    status: meetingStatus("status").notNull().default("scheduled"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    locationName: text("location_name"),
    address: text("address"),
    locationCapturedAt: timestamp("location_captured_at", { withTimezone: true }),
    locationSource: locationSource("location_source"),
    notes: text("notes").notNull().default(""),
    followUpCategory: followUpCategory("follow_up_category").notNull().default("none"),
    followUpNotes: text("follow_up_notes").notNull().default(""),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupScheduledIdx: index("meetings_group_scheduled_start_idx").on(table.groupId, table.scheduledStartAt),
    facilitatorIdx: index("meetings_facilitator_id_idx").on(table.facilitatorId),
    chaplainIdx: index("meetings_chaplain_user_id_idx").on(table.chaplainUserId),
    statusIdx: index("meetings_status_idx").on(table.status),
    validLatitude: check("meetings_valid_latitude", sql`${table.latitude} IS NULL OR (${table.latitude} >= -90 AND ${table.latitude} <= 90)`),
    validLongitude: check("meetings_valid_longitude", sql`${table.longitude} IS NULL OR (${table.longitude} >= -180 AND ${table.longitude} <= 180)`),
  }),
);

export const meetingAttendance = pgTable(
  "meeting_attendance",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: attendanceStatus("status").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingUserIdx: uniqueIndex("meeting_attendance_meeting_user_idx").on(table.meetingId, table.userId),
    userIdx: index("meeting_attendance_user_id_idx").on(table.userId),
  }),
);

export const prayerRequests = pgTable(
  "prayer_requests",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id),
    request: text("request").notNull(),
    status: prayerRequestStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    meetingIdx: index("prayer_requests_meeting_id_idx").on(table.meetingId),
  }),
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    type: mediaAssetType("type").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    groupId: uuid("group_id").references(() => groups.id),
    meetingId: uuid("meeting_id").references(() => meetings.id),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    checksumSha256: text("checksum_sha256"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    objectKeyIdx: uniqueIndex("media_assets_object_key_idx").on(table.objectKey),
    ownerUserIdx: index("media_assets_owner_user_id_idx").on(table.ownerUserId),
    groupIdx: index("media_assets_group_id_idx").on(table.groupId),
    meetingIdx: index("media_assets_meeting_id_idx").on(table.meetingId),
    positiveByteSize: check("media_assets_positive_byte_size", sql`${table.byteSize} >= 0`),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
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
