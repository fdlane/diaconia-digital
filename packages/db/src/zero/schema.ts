import {
  createBuilder,
  createSchema,
  definePermissions,
  enumeration,
  relationships,
  type ExpressionBuilder,
  type PermissionRule,
  string,
  table,
  boolean,
  number,
} from "@rocicorp/zero";

type AuthData = {
  sub: string;
  role?: "admin" | "facilitator" | "chaplain" | "member";
};

const users = table("users")
  .columns({
    id: string(),
    authProvider: string().from("auth_provider"),
    authSubject: string().from("auth_subject").optional(),
    displayName: string().from("display_name"),
    email: string().optional(),
    phone: string(),
    role: enumeration<"admin" | "facilitator" | "chaplain" | "member">(),
    status: enumeration<"invited" | "active" | "disabled">(),
    profilePhotoMediaId: string().from("profile_photo_media_id").optional(),
    invitedAt: number().from("invited_at").optional(),
    activatedAt: number().from("activated_at").optional(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const groups = table("groups")
  .columns({
    id: string(),
    name: string(),
    community: string(),
    facilitatorId: string().from("facilitator_id"),
    chaplainUserId: string().from("chaplain_user_id").optional(),
    profilePhotoMediaId: string().from("profile_photo_media_id").optional(),
    active: boolean(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const groupMemberships = table("group_memberships")
  .columns({
    id: string(),
    groupId: string().from("group_id"),
    userId: string().from("user_id"),
    position: enumeration<"president" | "secretary" | "treasurer">().optional(),
    active: boolean(),
    joinedAt: number().from("joined_at"),
    leftAt: number().from("left_at").optional(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const meetings = table("meetings")
  .columns({
    id: string(),
    groupId: string().from("group_id"),
    facilitatorId: string().from("facilitator_id"),
    chaplainUserId: string().from("chaplain_user_id").optional(),
    scheduledStartAt: number().from("scheduled_start_at"),
    scheduledEndAt: number().from("scheduled_end_at").optional(),
    occurredAt: number().from("occurred_at").optional(),
    status: enumeration<"scheduled" | "completed" | "cancelled">(),
    latitude: number().optional(),
    longitude: number().optional(),
    locationName: string().from("location_name").optional(),
    address: string().optional(),
    locationCapturedAt: number().from("location_captured_at").optional(),
    locationSource: enumeration<"manual" | "device" | "imported">().from("location_source").optional(),
    notes: string(),
    followUpCategory: enumeration<
      "none" | "financial" | "training" | "wellbeing" | "documentation" | "other"
    >().from("follow_up_category"),
    followUpNotes: string().from("follow_up_notes"),
    submittedAt: number().from("submitted_at").optional(),
    completedAt: number().from("completed_at").optional(),
    cancelledAt: number().from("cancelled_at").optional(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const meetingAttendance = table("meeting_attendance")
  .columns({
    id: string(),
    meetingId: string().from("meeting_id"),
    userId: string().from("user_id"),
    status: enumeration<"present" | "absent" | "excused">(),
    note: string(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const prayerRequests = table("prayer_requests")
  .columns({
    id: string(),
    meetingId: string().from("meeting_id"),
    request: string(),
    status: enumeration<"open" | "answered" | "archived">(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const mediaAssets = table("media_assets")
  .columns({
    id: string(),
    type: enumeration<"user_profile_photo" | "group_profile_photo" | "meeting_photo">(),
    ownerUserId: string().from("owner_user_id").optional(),
    groupId: string().from("group_id").optional(),
    meetingId: string().from("meeting_id").optional(),
    objectKey: string().from("object_key"),
    contentType: string().from("content_type"),
    byteSize: number().from("byte_size"),
    checksumSha256: string().from("checksum_sha256").optional(),
    createdAt: number().from("created_at"),
  })
  .primaryKey("id");

export const schema = createSchema({
  tables: [users, groups, groupMemberships, meetings, meetingAttendance, prayerRequests, mediaAssets],
  relationships: [
    relationships(users, ({ many }) => ({
      groupMemberships: many({
        sourceField: ["id"],
        destField: ["userId"],
        destSchema: groupMemberships,
      }),
      facilitatedGroups: many({
        sourceField: ["id"],
        destField: ["facilitatorId"],
        destSchema: groups,
      }),
      chaplainGroups: many({
        sourceField: ["id"],
        destField: ["chaplainUserId"],
        destSchema: groups,
      }),
      facilitatedMeetings: many({
        sourceField: ["id"],
        destField: ["facilitatorId"],
        destSchema: meetings,
      }),
      attendance: many({
        sourceField: ["id"],
        destField: ["userId"],
        destSchema: meetingAttendance,
      }),
      mediaAssets: many({
        sourceField: ["id"],
        destField: ["ownerUserId"],
        destSchema: mediaAssets,
      }),
    })),
    relationships(groups, ({ one, many }) => ({
      facilitator: one({
        sourceField: ["facilitatorId"],
        destField: ["id"],
        destSchema: users,
      }),
      chaplain: one({
        sourceField: ["chaplainUserId"],
        destField: ["id"],
        destSchema: users,
      }),
      memberships: many({
        sourceField: ["id"],
        destField: ["groupId"],
        destSchema: groupMemberships,
      }),
      meetings: many({
        sourceField: ["id"],
        destField: ["groupId"],
        destSchema: meetings,
      }),
      mediaAssets: many({
        sourceField: ["id"],
        destField: ["groupId"],
        destSchema: mediaAssets,
      }),
    })),
    relationships(groupMemberships, ({ one }) => ({
      group: one({
        sourceField: ["groupId"],
        destField: ["id"],
        destSchema: groups,
      }),
      user: one({
        sourceField: ["userId"],
        destField: ["id"],
        destSchema: users,
      }),
    })),
    relationships(meetings, ({ one, many }) => ({
      group: one({
        sourceField: ["groupId"],
        destField: ["id"],
        destSchema: groups,
      }),
      facilitator: one({
        sourceField: ["facilitatorId"],
        destField: ["id"],
        destSchema: users,
      }),
      chaplain: one({
        sourceField: ["chaplainUserId"],
        destField: ["id"],
        destSchema: users,
      }),
      attendance: many({
        sourceField: ["id"],
        destField: ["meetingId"],
        destSchema: meetingAttendance,
      }),
      prayerRequests: many({
        sourceField: ["id"],
        destField: ["meetingId"],
        destSchema: prayerRequests,
      }),
      mediaAssets: many({
        sourceField: ["id"],
        destField: ["meetingId"],
        destSchema: mediaAssets,
      }),
    })),
    relationships(meetingAttendance, ({ one }) => ({
      meeting: one({
        sourceField: ["meetingId"],
        destField: ["id"],
        destSchema: meetings,
      }),
      user: one({
        sourceField: ["userId"],
        destField: ["id"],
        destSchema: users,
      }),
    })),
    relationships(prayerRequests, ({ one }) => ({
      meeting: one({
        sourceField: ["meetingId"],
        destField: ["id"],
        destSchema: meetings,
      }),
    })),
    relationships(mediaAssets, ({ one }) => ({
      owner: one({
        sourceField: ["ownerUserId"],
        destField: ["id"],
        destSchema: users,
      }),
      group: one({
        sourceField: ["groupId"],
        destField: ["id"],
        destSchema: groups,
      }),
      meeting: one({
        sourceField: ["meetingId"],
        destField: ["id"],
        destSchema: meetings,
      }),
    })),
  ],
  enableLegacyQueries: false,
  enableLegacyMutators: false,
});

export type ZeroSchema = typeof schema;
export const zql = createBuilder(schema);

type Schema = ZeroSchema;
type TableName = keyof Schema["tables"] & string;
type AuthParameter = Parameters<ExpressionBuilder<Schema, TableName>["cmpLit"]>[0];

const allowIfAuthenticated = (<TTable extends TableName>(
  authData: AuthData,
  eb: ExpressionBuilder<Schema, TTable>,
) => {
  const authSubject = (authData as unknown as { sub: AuthParameter }).sub;
  return eb.cmpLit(authSubject, "IS NOT", null);
}) satisfies PermissionRule<AuthData, Schema, TableName>;

const readOnly = {
  row: {
    select: [allowIfAuthenticated],
  },
};

export const permissions = await definePermissions<AuthData, Schema>(schema, () => ({
  users: readOnly,
  groups: readOnly,
  group_memberships: readOnly,
  meetings: readOnly,
  meeting_attendance: readOnly,
  prayer_requests: readOnly,
  media_assets: readOnly,
}));
