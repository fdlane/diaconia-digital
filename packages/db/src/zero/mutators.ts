import type { CustomMutatorImpl } from "@rocicorp/zero";
import { z } from "zod";
import type { ZeroSchema } from "./schema.js";

type Transaction = Parameters<CustomMutatorImpl<ZeroSchema>>[0];
type Mutator<TArgs> = CustomMutatorImpl<ZeroSchema, unknown, TArgs>;

function defineAppMutator<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  handler: (tx: Transaction, args: z.infer<TSchema>) => Promise<void>,
): Mutator<z.infer<TSchema>> {
  return async (tx, args) => handler(tx, schema.parse(args));
}

const uuid = z.string().uuid();
const nullableUuid = uuid.nullable().optional();
const timestamp = z.number().int().nonnegative();
const optionalTimestamp = timestamp.nullable().optional();
const role = z.enum(["admin", "facilitator", "chaplain", "member"]);
const userStatus = z.enum(["invited", "active", "disabled"]);
const position = z.enum(["president", "secretary", "treasurer"]).nullable().optional();
const meetingStatus = z.enum(["scheduled", "completed", "cancelled"]);
const attendanceStatus = z.enum(["present", "absent", "excused"]);
const prayerStatus = z.enum(["open", "answered", "archived"]);
const followUpCategory = z.enum(["none", "financial", "training", "wellbeing", "documentation", "other"]);
const locationSource = z.enum(["manual", "device", "imported"]).nullable().optional();
const mediaType = z.enum(["user_profile_photo", "group_profile_photo", "meeting_photo"]);

export const zeroMutators = {
  users: {
    create: defineAppMutator(
      z.object({
        id: uuid,
        authProvider: z.string().default("clerk"),
        authSubject: z.string().nullable().optional(),
        displayName: z.string().min(1),
        email: z.string().nullable().optional(),
        phone: z.string().default(""),
        role: role.default("member"),
        status: userStatus.default("active"),
        profilePhotoMediaId: nullableUuid,
        invitedAt: optionalTimestamp,
        activatedAt: optionalTimestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.users.insert(args);
      },
    ),
    update: defineAppMutator(
      z.object({
        id: uuid,
        authProvider: z.string().optional(),
        authSubject: z.string().nullable().optional(),
        displayName: z.string().min(1).optional(),
        email: z.string().nullable().optional(),
        phone: z.string().optional(),
        role: role.optional(),
        status: userStatus.optional(),
        profilePhotoMediaId: nullableUuid,
        invitedAt: optionalTimestamp,
        activatedAt: optionalTimestamp,
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.users.update(args);
      },
    ),
    disable: defineAppMutator(z.object({ id: uuid, updatedAt: timestamp }), async (tx, args) => {
      await tx.mutate.users.update({ id: args.id, status: "disabled", updatedAt: args.updatedAt });
    }),
  },
  groups: {
    create: defineAppMutator(
      z.object({
        id: uuid,
        name: z.string().min(1),
        community: z.string().default(""),
        facilitatorId: uuid,
        chaplainUserId: nullableUuid,
        profilePhotoMediaId: nullableUuid,
        active: z.boolean().default(true),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.groups.insert(args);
      },
    ),
    update: defineAppMutator(
      z.object({
        id: uuid,
        name: z.string().min(1).optional(),
        community: z.string().optional(),
        facilitatorId: uuid.optional(),
        chaplainUserId: nullableUuid,
        profilePhotoMediaId: nullableUuid,
        active: z.boolean().optional(),
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.groups.update(args);
      },
    ),
  },
  groupMemberships: {
    upsert: defineAppMutator(
      z.object({
        id: uuid,
        groupId: uuid,
        userId: uuid,
        position,
        active: z.boolean().default(true),
        joinedAt: timestamp,
        leftAt: optionalTimestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.group_memberships.upsert(args);
      },
    ),
    update: defineAppMutator(
      z.object({ id: uuid, position, active: z.boolean().optional(), leftAt: optionalTimestamp, updatedAt: timestamp }),
      async (tx, args) => {
        await tx.mutate.group_memberships.update(args);
      },
    ),
  },
  meetings: {
    upsert: defineAppMutator(
      z.object({
        id: uuid,
        groupId: uuid,
        facilitatorId: uuid,
        chaplainUserId: nullableUuid,
        scheduledStartAt: timestamp,
        scheduledEndAt: optionalTimestamp,
        occurredAt: optionalTimestamp,
        status: meetingStatus,
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
        locationName: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        locationCapturedAt: optionalTimestamp,
        locationSource,
        notes: z.string().default(""),
        followUpCategory: followUpCategory.default("none"),
        followUpNotes: z.string().default(""),
        submittedAt: optionalTimestamp,
        completedAt: optionalTimestamp,
        cancelledAt: optionalTimestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.meetings.upsert(args);
      },
    ),
    update: defineAppMutator(
      z.object({
        id: uuid,
        status: meetingStatus.optional(),
        occurredAt: optionalTimestamp,
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
        locationName: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        locationCapturedAt: optionalTimestamp,
        locationSource,
        notes: z.string().optional(),
        followUpCategory: followUpCategory.optional(),
        followUpNotes: z.string().optional(),
        submittedAt: optionalTimestamp,
        completedAt: optionalTimestamp,
        cancelledAt: optionalTimestamp,
        updatedAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.meetings.update(args);
      },
    ),
  },
  meetingAttendance: {
    upsert: defineAppMutator(
      z.object({ id: uuid, meetingId: uuid, userId: uuid, status: attendanceStatus, note: z.string().default(""), createdAt: timestamp, updatedAt: timestamp }),
      async (tx, args) => {
        await tx.mutate.meeting_attendance.upsert(args);
      },
    ),
  },
  prayerRequests: {
    upsert: defineAppMutator(
      z.object({ id: uuid, meetingId: uuid, request: z.string().min(1), status: prayerStatus.default("open"), createdAt: timestamp, updatedAt: timestamp }),
      async (tx, args) => {
        await tx.mutate.prayer_requests.upsert(args);
      },
    ),
    update: defineAppMutator(
      z.object({ id: uuid, request: z.string().min(1).optional(), status: prayerStatus.optional(), updatedAt: timestamp }),
      async (tx, args) => {
        await tx.mutate.prayer_requests.update(args);
      },
    ),
  },
  mediaAssets: {
    upsert: defineAppMutator(
      z.object({
        id: uuid,
        type: mediaType,
        ownerUserId: nullableUuid,
        groupId: nullableUuid,
        meetingId: nullableUuid,
        objectKey: z.string().default(""),
        contentType: z.string(),
        byteSize: z.number().nonnegative(),
        checksumSha256: z.string().nullable().optional(),
        createdAt: timestamp,
      }),
      async (tx, args) => {
        await tx.mutate.media_assets.upsert(args);
      },
    ),
  },
};
