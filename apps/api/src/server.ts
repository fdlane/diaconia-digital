import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  auditEvents,
  createDatabase,
  createZeroSyncHandlers,
  groupMemberships,
  groups,
  invitations,
  mediaAssets,
  meetingAttendance,
  meetings,
  prayerRequests,
  users,
  type ZeroAuthContext,
} from "@diaconia/db";
import {
  createMediaUploadInputSchema,
  createMeetingInputSchema,
  followUpCategorySchema,
  type CreateMediaUploadResponse,
} from "@diaconia/shared";
import { serve } from "@hono/node-server";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { createHash, randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { createUserSchema, updateUserSchema } from "./adminValidation.js";
import { authMiddleware, type AppBindings } from "./auth.js";
import { loadConfig } from "./config.js";
import { openApiDocument } from "./openapi.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const zeroSync = createZeroSyncHandlers(db);
const s3 = new S3Client({ region: config.awsRegion });

const profilePhotoBodySchema = z.object({ mediaId: z.string().uuid() });
const groupPositionSchema = z.enum(["president", "secretary", "treasurer"]).nullable().optional();

const app = new Hono<AppBindings>();
const api = new Hono<AppBindings>();

api.use(
  "*",
  cors({
    origin: config.allowedOrigins,
    allowHeaders: ["authorization", "content-type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

api.get("/health", (c) =>
  c.json({
    ok: true,
    service: "diaconia-foundation-api",
    region: config.awsRegion,
  }),
);

api.get("/openapi.json", (c) => c.json(openApiDocument));

api.use("/me", authMiddleware(config));
api.use("/me/*", authMiddleware(config));
api.use("/media/*", authMiddleware(config));
api.use("/meetings", authMiddleware(config));
api.use("/meetings/*", authMiddleware(config));
api.use("/zero/*", authMiddleware(config));
api.use("/users", authMiddleware(config));
api.use("/users/*", authMiddleware(config));
api.use("/groups", authMiddleware(config));
api.use("/groups/*", authMiddleware(config));
api.use("/chaplains", authMiddleware(config));

type DbUser = typeof users.$inferSelect;

type ApiContext = Context<AppBindings>;

async function getActor(c: ApiContext): Promise<DbUser | null> {
  const authUser = c.get("authUser");
  const [bySubject] = await db
    .select()
    .from(users)
    .where(and(eq(users.authProvider, "clerk"), eq(users.authSubject, authUser.sub)))
    .limit(1);

  if (bySubject) return bySubject;

  if (!authUser.phone) return null;

  const authUserPhoneDigits = authUser.phone.replace(/\D/g, "");
  const [invited] = await db
    .select()
    .from(users)
    .where(
      and(
        sql`regexp_replace(${users.phone}, '[^0-9]', '', 'g') = ${authUserPhoneDigits}`,
        inArray(users.status, ["invited", "active"]),
      ),
    )
    .limit(1);

  if (!invited) return null;

  await db
    .update(users)
    .set({
      authProvider: "clerk",
      authSubject: authUser.sub,
      status: "active",
      activatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, invited.id));

  await db
    .update(invitations)
    .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invitations.userId, invited.id), eq(invitations.status, "pending")));

  return {
    ...invited,
    authProvider: "clerk",
    authSubject: authUser.sub,
    status: "active",
    activatedAt: new Date(),
  };
}

async function requireActor(c: ApiContext) {
  const authUser = c.get("authUser");
  const actor = await getActor(c);
  if (!actor || actor.status !== "active") {
    return {
      actor: null,
      response: c.json(
        {
          error: "Invited active user required",
          code: "INVITE_REQUIRED",
          ...(process.env.NODE_ENV !== "production"
            ? { details: { hasPhoneClaim: Boolean(authUser.phone), phone: authUser.phone } }
            : {}),
        },
        403,
      ),
    };
  }
  return { actor, response: null };
}

async function requireAdmin(c: ApiContext) {
  const result = await requireActor(c);
  if (result.response) return result;
  if (result.actor!.role !== "admin") {
    return {
      actor: result.actor,
      response: c.json({ error: "Admin role required", code: "ADMIN_REQUIRED" }, 403),
    };
  }
  return result;
}

function zeroContextFromActor(actor: DbUser): ZeroAuthContext {
  return {
    userId: actor.id,
    role: actor.role,
  };
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function numberOrNull(value: string | null) {
  return value == null ? null : Number(value);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return randomBytes(32).toString("base64url");
}

api.get("/me", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  return c.json({
    user: {
      id: actor!.id,
      displayName: actor!.displayName,
      email: actor!.email,
      phone: actor!.phone,
      role: actor!.role,
      status: actor!.status,
      profilePhotoMediaId: actor!.profilePhotoMediaId,
      authProvider: actor!.authProvider,
      authSubject: actor!.authSubject,
    },
  });
});

function meetingResponse(row: {
  id: string;
  groupId?: string;
  facilitatorId?: string;
  chaplainUserId?: string | null;
  scheduledStartAt: Date;
  scheduledEndAt?: Date | null;
  occurredAt?: Date | null;
  status?: "scheduled" | "completed" | "cancelled";
  latitude: string | null;
  longitude: string | null;
  locationName?: string | null;
  address?: string | null;
  locationCapturedAt?: Date | null;
  locationSource?: "manual" | "device" | "imported" | null;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
  submittedAt: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  groupName?: string;
  community?: string;
  facilitatorName?: string;
}) {
  return {
    ...row,
    scheduledStartAt: row.scheduledStartAt.toISOString(),
    scheduledEndAt: iso(row.scheduledEndAt ?? null),
    occurredAt: iso(row.occurredAt ?? null),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    locationCapturedAt: iso(row.locationCapturedAt ?? null),
    submittedAt: iso(row.submittedAt),
    completedAt: iso(row.completedAt ?? null),
    cancelledAt: iso(row.cancelledAt ?? null),
    heldAt: (row.occurredAt ?? row.scheduledStartAt).toISOString(),
    chaplainId: row.chaplainUserId ?? null,
  };
}

api.post("/zero/query", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  try {
    const result = await zeroSync.query(zeroContextFromActor(actor!), c.req.raw);
    return c.json(result);
  } catch (error) {
    return c.json(
      {
        error: "Zero query failed",
        message: error instanceof Error ? error.message : "Unknown Zero query error",
      },
      400,
    );
  }
});

api.post("/zero/mutate", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  try {
    const result = await zeroSync.mutate(c.req.raw);
    return c.json(result);
  } catch (error) {
    return c.json(
      {
        error: "Zero mutation failed",
        message: error instanceof Error ? error.message : "Unknown Zero mutation error",
      },
      400,
    );
  }
});

api.post("/media/uploads", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  const body = createMediaUploadInputSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: "Invalid upload request", details: body.error.flatten() }, 400);
  }

  const mediaId = uuidv7();
  const extension = body.data.contentType.split("/")[1] ?? "jpg";
  const objectKey = `foundation/${body.data.type}/${mediaId}.${extension}`;

  await db.insert(mediaAssets).values({
    id: mediaId,
    type: body.data.type,
    ownerUserId: body.data.ownerUserId ?? null,
    groupId: body.data.groupId ?? null,
    meetingId: body.data.meetingId ?? null,
    objectKey,
    contentType: body.data.contentType,
    byteSize: body.data.byteSize,
  });

  await db.insert(auditEvents).values({
    actorUserId: actor!.id,
    action: "media_upload_url_created",
    entityType: "media_asset",
    entityId: mediaId,
    metadataJson: JSON.stringify({ type: body.data.type }),
  });

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: config.mediaBucketName,
      Key: objectKey,
      ContentType: body.data.contentType,
      ServerSideEncryption: "aws:kms",
    }),
    { expiresIn: 900 },
  );

  const result: CreateMediaUploadResponse = {
    mediaId,
    objectKey,
    uploadUrl,
    headers: {
      "content-type": body.data.contentType,
      "x-amz-server-side-encryption": "aws:kms",
    },
  };

  return c.json(result);
});

api.get("/media/:mediaId/access", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  const mediaId = c.req.param("mediaId");
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
  if (!asset) return c.json({ error: "Media not found" }, 404);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: config.mediaBucketName,
      Key: asset.objectKey,
    }),
    { expiresIn: 300 },
  );

  return c.json({ id: asset.id, type: asset.type, url, contentType: asset.contentType });
});

api.post("/me/profile-photo", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  const body = profilePhotoBodySchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "mediaId is required and must be a valid UUID" }, 400);

  const [asset] = await db
    .select({ ownerUserId: mediaAssets.ownerUserId, type: mediaAssets.type })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, body.data.mediaId))
    .limit(1);

  if (!asset || asset.ownerUserId !== actor!.id || asset.type !== "user_profile_photo") {
    return c.json({ error: "Media not found or not owned by user" }, 403);
  }

  await db.update(users).set({ profilePhotoMediaId: body.data.mediaId, updatedAt: new Date() }).where(eq(users.id, actor!.id));
  return c.json({ ok: true });
});

api.get("/users", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      authProvider: users.authProvider,
      authSubject: users.authSubject,
      createdAt: users.createdAt,
      groupId: groups.id,
      groupName: groups.name,
      community: groups.community,
      meetingCount: sql<number>`cast(count(distinct ${meetings.id}) as integer)`,
    })
    .from(users)
    .leftJoin(groupMemberships, and(eq(groupMemberships.userId, users.id), eq(groupMemberships.active, true)))
    .leftJoin(groups, eq(groups.id, groupMemberships.groupId))
    .leftJoin(meetings, eq(meetings.facilitatorId, users.id))
    .groupBy(users.id, groups.id)
    .orderBy(users.displayName);

  return c.json({
    users: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      meetingCount: row.meetingCount,
      authSubject: row.authSubject ?? "",
    })),
  });
});

api.get("/users/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const userId = c.req.param("id");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: "User not found" }, 404);

  const userGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      community: groups.community,
      active: groups.active,
      position: groupMemberships.position,
      createdAt: groups.createdAt,
      updatedAt: groups.updatedAt,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(and(eq(groupMemberships.userId, userId), eq(groupMemberships.active, true)));

  const countRows = await db
    .select({ meetingCount: sql<number>`cast(count(*) as integer)` })
    .from(meetings)
    .where(eq(meetings.facilitatorId, userId));

  return c.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      invitedAt: iso(user.invitedAt),
      activatedAt: iso(user.activatedAt),
      authSubject: user.authSubject ?? "",
    },
    groups: userGroups.map((group) => ({
      ...group,
      facilitatorId: userId,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    })),
    meetingCount: countRows[0]?.meetingCount ?? 0,
  });
});

api.post("/users", async (c) => {
  const { actor, response } = await requireAdmin(c);
  if (response) return response;

  const body = createUserSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const userId = uuidv7();
  const inviteToken = createInviteToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      authProvider: "clerk",
      authSubject: body.data.authSubject ?? null,
      displayName: body.data.displayName,
      email: body.data.email ?? null,
      phone: body.data.phone,
      role: body.data.role,
      status: body.data.authSubject ? "active" : body.data.status,
      invitedAt: now,
      activatedAt: body.data.authSubject ? now : null,
    });

    await tx.insert(invitations).values({
      userId,
      phone: body.data.phone,
      email: body.data.email ?? null,
      tokenHash: hashToken(inviteToken),
      status: body.data.authSubject ? "accepted" : "pending",
      expiresAt,
      acceptedAt: body.data.authSubject ? now : null,
      invitedByUserId: actor!.id,
    });
  });

  return c.json({ id: userId, status: "created", invitationToken: inviteToken }, 201);
});

api.put("/users/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const userId = c.req.param("id");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return c.json({ error: "User not found" }, 404);

  const body = updateUserSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  await db.update(users).set({ ...body.data, updatedAt: new Date() }).where(eq(users.id, userId));
  return c.json({ status: "updated" });
});

api.delete("/users/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const userId = c.req.param("id");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return c.json({ error: "User not found" }, 404);

  await db.update(users).set({ status: "disabled", updatedAt: new Date() }).where(eq(users.id, userId));
  return c.json({ status: "disabled" });
});

api.get("/chaplains", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const rows = await db
    .select({ id: users.id, displayName: users.displayName, email: users.email, phone: users.phone, role: users.role })
    .from(users)
    .where(and(eq(users.role, "chaplain"), eq(users.status, "active")))
    .orderBy(users.displayName);

  return c.json({ chaplains: rows });
});

api.get("/groups", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  const isAdmin = actor!.role === "admin";
  const rows = isAdmin
    ? await db
        .select({
          id: groups.id,
          name: groups.name,
          community: groups.community,
          facilitatorId: groups.facilitatorId,
          facilitatorName: users.displayName,
          chaplainUserId: groups.chaplainUserId,
          profilePhotoMediaId: groups.profilePhotoMediaId,
          active: groups.active,
          createdAt: groups.createdAt,
          meetingCount: sql<number>`cast(count(distinct ${meetings.id}) as integer)`,
          memberCount: sql<number>`cast(count(distinct ${groupMemberships.id}) as integer)`,
        })
        .from(groups)
        .innerJoin(users, eq(groups.facilitatorId, users.id))
        .leftJoin(meetings, eq(meetings.groupId, groups.id))
        .leftJoin(groupMemberships, and(eq(groupMemberships.groupId, groups.id), eq(groupMemberships.active, true)))
        .groupBy(groups.id, users.id)
        .orderBy(groups.name)
    : await db
        .select({
          id: groups.id,
          name: groups.name,
          community: groups.community,
          facilitatorId: groups.facilitatorId,
          facilitatorName: users.displayName,
          chaplainUserId: groups.chaplainUserId,
          profilePhotoMediaId: groups.profilePhotoMediaId,
          active: groups.active,
          createdAt: groups.createdAt,
          meetingCount: sql<number>`cast(count(distinct ${meetings.id}) as integer)`,
          memberCount: sql<number>`cast(count(distinct ${groupMemberships.id}) as integer)`,
        })
        .from(groupMemberships)
        .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
        .innerJoin(users, eq(groups.facilitatorId, users.id))
        .leftJoin(meetings, eq(meetings.groupId, groups.id))
        .where(and(eq(groupMemberships.userId, actor!.id), eq(groupMemberships.active, true)))
        .groupBy(groups.id, users.id)
        .orderBy(groups.name);

  return c.json({
    groups: rows.map((row) => ({
      ...row,
      chaplainId: row.chaplainUserId,
      meetingCount: row.meetingCount,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

api.post("/groups", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const schema = z.object({
    name: z.string().min(1),
    community: z.string().min(1),
    facilitatorId: z.string().uuid(),
    chaplainUserId: z.string().uuid().nullable().optional(),
    chaplainId: z.string().uuid().nullable().optional(),
    active: z.boolean().default(true),
  });
  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const chaplainUserId = body.data.chaplainUserId ?? body.data.chaplainId ?? null;
  const groupId = uuidv7();
  await db.transaction(async (tx) => {
    await tx.insert(groups).values({
      id: groupId,
      name: body.data.name,
      community: body.data.community,
      facilitatorId: body.data.facilitatorId,
      chaplainUserId,
      active: body.data.active,
    });
    await tx.insert(groupMemberships).values({
      groupId,
      userId: body.data.facilitatorId,
    }).onConflictDoNothing();
  });

  return c.json({ id: groupId, status: "created" }, 201);
});

api.get("/groups/:id", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  const groupId = c.req.param("id");
  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      community: groups.community,
      active: groups.active,
      facilitatorId: groups.facilitatorId,
      facilitatorName: users.displayName,
      facilitatorEmail: users.email,
      chaplainUserId: groups.chaplainUserId,
      profilePhotoMediaId: groups.profilePhotoMediaId,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .innerJoin(users, eq(groups.facilitatorId, users.id))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) return c.json({ error: "Group not found" }, 404);

  const chaplainRows = group.chaplainUserId
    ? await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, group.chaplainUserId)).limit(1)
    : [];

  const memberships = await db
    .select({
      id: groupMemberships.id,
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      position: groupMemberships.position,
      active: groupMemberships.active,
      joinedAt: groupMemberships.joinedAt,
      leftAt: groupMemberships.leftAt,
    })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(eq(groupMemberships.groupId, groupId))
    .orderBy(users.displayName);

  const countRows = await db
    .select({ meetingCount: sql<number>`cast(count(*) as integer)` })
    .from(meetings)
    .where(eq(meetings.groupId, groupId));

  const chaplain = chaplainRows[0] ?? null;
  return c.json({
    group: {
      ...group,
      chaplainId: group.chaplainUserId,
      chaplainName: chaplain?.displayName ?? null,
      chaplainEmail: chaplain?.email ?? null,
      createdAt: group.createdAt.toISOString(),
    },
    memberships: memberships.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
      leftAt: iso(member.leftAt),
    })),
    meetingCount: countRows[0]?.meetingCount ?? 0,
  });
});

api.put("/groups/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const groupId = c.req.param("id");
  const schema = z.object({
    name: z.string().min(1).optional(),
    community: z.string().min(1).optional(),
    facilitatorId: z.string().uuid().optional(),
    chaplainUserId: z.string().uuid().nullable().optional(),
    chaplainId: z.string().uuid().nullable().optional(),
    active: z.boolean().optional(),
  });
  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.name !== undefined) update.name = body.data.name;
  if (body.data.community !== undefined) update.community = body.data.community;
  if (body.data.facilitatorId !== undefined) update.facilitatorId = body.data.facilitatorId;
  if (body.data.chaplainUserId !== undefined) update.chaplainUserId = body.data.chaplainUserId;
  if (body.data.chaplainId !== undefined) update.chaplainUserId = body.data.chaplainId;
  if (body.data.active !== undefined) update.active = body.data.active;

  await db.update(groups).set(update).where(eq(groups.id, groupId));
  return c.json({ status: "updated" });
});

api.delete("/groups/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  await db.update(groups).set({ active: false, updatedAt: new Date() }).where(eq(groups.id, c.req.param("id")));
  return c.json({ status: "disabled" });
});

api.get("/groups/:groupId/memberships", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  const groupId = c.req.param("groupId");
  const rows = await db
    .select({
      id: groupMemberships.id,
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      position: groupMemberships.position,
      active: groupMemberships.active,
      joinedAt: groupMemberships.joinedAt,
      leftAt: groupMemberships.leftAt,
    })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(eq(groupMemberships.groupId, groupId))
    .orderBy(users.displayName);

  return c.json({
    memberships: rows.map((row) => ({ ...row, joinedAt: row.joinedAt.toISOString(), leftAt: iso(row.leftAt) })),
  });
});

api.post("/groups/:groupId/memberships", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const groupId = c.req.param("groupId");
  const schema = z.object({
    userId: z.string().uuid(),
    position: groupPositionSchema,
    active: z.boolean().default(true),
  });
  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const membershipId = uuidv7();
  await db.insert(groupMemberships).values({
    id: membershipId,
    groupId,
    userId: body.data.userId,
    position: body.data.position ?? null,
    active: body.data.active,
  });

  return c.json({ id: membershipId, status: "created" }, 201);
});

api.put("/groups/:groupId/memberships/:membershipId", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const membershipId = c.req.param("membershipId");
  const schema = z.object({
    position: groupPositionSchema,
    active: z.boolean().optional(),
  });
  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.position !== undefined) update.position = body.data.position;
  if (body.data.active !== undefined) {
    update.active = body.data.active;
    update.leftAt = body.data.active ? null : new Date();
  }

  await db.update(groupMemberships).set(update).where(eq(groupMemberships.id, membershipId));
  return c.json({ status: "updated" });
});

api.get("/meetings", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  const facilitatorId = c.req.query("facilitatorId");
  const groupId = c.req.query("groupId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const filters = [
    facilitatorId ? eq(meetings.facilitatorId, facilitatorId) : undefined,
    groupId ? eq(meetings.groupId, groupId) : undefined,
    from ? gte(meetings.scheduledStartAt, new Date(from)) : undefined,
    to ? lte(meetings.scheduledStartAt, new Date(to)) : undefined,
    actor!.role === "admin"
      ? undefined
      : or(
          eq(meetings.facilitatorId, actor!.id),
          sql`exists (
            select 1
            from ${groupMemberships}
            where ${groupMemberships.groupId} = ${meetings.groupId}
              and ${groupMemberships.userId} = ${actor!.id}
              and ${groupMemberships.active} = true
          )`,
        ),
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));

  const selected = {
    id: meetings.id,
    groupId: meetings.groupId,
    facilitatorId: meetings.facilitatorId,
    chaplainUserId: meetings.chaplainUserId,
    scheduledStartAt: meetings.scheduledStartAt,
    scheduledEndAt: meetings.scheduledEndAt,
    occurredAt: meetings.occurredAt,
    status: meetings.status,
    latitude: meetings.latitude,
    longitude: meetings.longitude,
    locationName: meetings.locationName,
    address: meetings.address,
    locationCapturedAt: meetings.locationCapturedAt,
    locationSource: meetings.locationSource,
    notes: meetings.notes,
    followUpCategory: meetings.followUpCategory,
    followUpNotes: meetings.followUpNotes,
    submittedAt: meetings.submittedAt,
    completedAt: meetings.completedAt,
    cancelledAt: meetings.cancelledAt,
    groupName: groups.name,
    community: groups.community,
    facilitatorName: users.displayName,
    mediaCount: sql<number>`cast(count(distinct ${mediaAssets.id}) as integer)`,
    prayerRequestCount: sql<number>`cast(count(distinct ${prayerRequests.id}) as integer)`,
    openPrayerRequestCount: sql<number>`cast(count(distinct case when ${prayerRequests.status} = 'open' then ${prayerRequests.id} end) as integer)`,
  };

  const query = db
    .select(selected)
    .from(meetings)
    .innerJoin(groups, eq(meetings.groupId, groups.id))
    .innerJoin(users, eq(meetings.facilitatorId, users.id))
    .leftJoin(mediaAssets, eq(mediaAssets.meetingId, meetings.id))
    .leftJoin(prayerRequests, eq(prayerRequests.meetingId, meetings.id))
    .groupBy(meetings.id, groups.name, groups.community, users.displayName)
    .orderBy(desc(meetings.scheduledStartAt))
    .limit(100);

  const rows = filters.length ? await query.where(and(...filters)) : await query;
  const mapped = rows.map(meetingResponse);
  return c.json({ meetings: mapped });
});

api.post("/meetings", async (c) => {
  const { actor, response } = await requireActor(c);
  if (response) return response;

  const raw = (await c.req.json()) as Record<string, unknown>;
  const body = createMeetingInputSchema.safeParse({
    ...raw,
    id: raw.id ?? uuidv7(),
    scheduledStartAt: raw.scheduledStartAt ?? raw.heldAt,
    status: raw.status ?? "completed",
    attendance: raw.attendance ?? [],
    prayerRequests: raw.prayerRequests ?? [],
    meetingPhotoMediaIds: raw.meetingPhotoMediaIds ?? [],
  });
  if (!body.success) return c.json({ error: "Invalid meeting", details: body.error.flatten() }, 400);

  const [group] = await db.select().from(groups).where(eq(groups.id, body.data.groupId)).limit(1);
  if (!group) return c.json({ error: "Group not found" }, 404);

  const userIds = Array.from(new Set(body.data.attendance.map((record) => record.userId)));
  if (userIds.length) {
    const knownMemberships = await db
      .select({ userId: groupMemberships.userId })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, body.data.groupId), eq(groupMemberships.active, true), inArray(groupMemberships.userId, userIds)));
    const known = new Set(knownMemberships.map((membership) => membership.userId));
    const invalidUserIds = userIds.filter((userId) => !known.has(userId));
    if (invalidUserIds.length) {
      return c.json({ error: "Meeting contains users outside the selected group", userIds: invalidUserIds }, 400);
    }
  }

  await db.transaction(async (tx) => {
    const occurredAt = body.data.occurredAt ? new Date(body.data.occurredAt) : null;
    const completedAt = body.data.status === "completed" ? new Date() : null;
    const cancelledAt = body.data.status === "cancelled" ? new Date() : null;

    await tx
      .insert(meetings)
      .values({
        id: body.data.id,
        groupId: body.data.groupId,
        facilitatorId: actor!.id,
        chaplainUserId: group.chaplainUserId,
        scheduledStartAt: new Date(body.data.scheduledStartAt),
        scheduledEndAt: body.data.scheduledEndAt ? new Date(body.data.scheduledEndAt) : null,
        occurredAt,
        status: body.data.status,
        latitude: body.data.latitude != null ? String(body.data.latitude) : null,
        longitude: body.data.longitude != null ? String(body.data.longitude) : null,
        locationName: body.data.locationName ?? null,
        address: body.data.address ?? null,
        locationCapturedAt: body.data.locationCapturedAt ? new Date(body.data.locationCapturedAt) : null,
        locationSource: body.data.locationSource ?? null,
        notes: body.data.notes,
        followUpCategory: body.data.followUpCategory,
        followUpNotes: body.data.followUpNotes,
        submittedAt: new Date(),
        completedAt,
        cancelledAt,
      })
      .onConflictDoUpdate({
        target: meetings.id,
        set: {
          scheduledStartAt: new Date(body.data.scheduledStartAt),
          scheduledEndAt: body.data.scheduledEndAt ? new Date(body.data.scheduledEndAt) : null,
          occurredAt,
          status: body.data.status,
          latitude: body.data.latitude != null ? String(body.data.latitude) : null,
          longitude: body.data.longitude != null ? String(body.data.longitude) : null,
          locationName: body.data.locationName ?? null,
          address: body.data.address ?? null,
          locationCapturedAt: body.data.locationCapturedAt ? new Date(body.data.locationCapturedAt) : null,
          locationSource: body.data.locationSource ?? null,
          notes: body.data.notes,
          followUpCategory: body.data.followUpCategory,
          followUpNotes: body.data.followUpNotes,
          submittedAt: new Date(),
          completedAt,
          cancelledAt,
          updatedAt: new Date(),
        },
      });

    for (const record of body.data.attendance) {
      await tx
        .insert(meetingAttendance)
        .values({
          meetingId: body.data.id,
          userId: record.userId,
          status: record.status,
          note: record.note,
        })
        .onConflictDoUpdate({
          target: [meetingAttendance.meetingId, meetingAttendance.userId],
          set: { status: record.status, note: record.note, updatedAt: new Date() },
        });
    }

    for (const prayer of body.data.prayerRequests) {
      await tx
        .insert(prayerRequests)
        .values({
          id: prayer.id,
          meetingId: body.data.id,
          request: prayer.request,
          status: "open",
        })
        .onConflictDoUpdate({
          target: prayerRequests.id,
          set: { request: prayer.request, status: "open", updatedAt: new Date() },
        });
    }

    if (body.data.meetingPhotoMediaIds.length) {
      await tx.update(mediaAssets).set({ meetingId: body.data.id }).where(inArray(mediaAssets.id, body.data.meetingPhotoMediaIds));
    }

    await tx.insert(auditEvents).values({
      actorUserId: actor!.id,
      action: "meeting_submitted",
      entityType: "meeting",
      entityId: body.data.id,
      metadataJson: JSON.stringify({
        attendanceCount: body.data.attendance.length,
        meetingPhotoCount: body.data.meetingPhotoMediaIds.length,
      }),
    });
  });

  return c.json({ id: body.data.id, status: "accepted" }, 201);
});

api.get("/meetings/:id", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  const meetingId = c.req.param("id");
  const [meeting] = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      facilitatorId: meetings.facilitatorId,
      chaplainUserId: meetings.chaplainUserId,
      scheduledStartAt: meetings.scheduledStartAt,
      scheduledEndAt: meetings.scheduledEndAt,
      occurredAt: meetings.occurredAt,
      status: meetings.status,
      latitude: meetings.latitude,
      longitude: meetings.longitude,
      locationName: meetings.locationName,
      address: meetings.address,
      locationCapturedAt: meetings.locationCapturedAt,
      locationSource: meetings.locationSource,
      notes: meetings.notes,
      followUpCategory: meetings.followUpCategory,
      followUpNotes: meetings.followUpNotes,
      submittedAt: meetings.submittedAt,
      completedAt: meetings.completedAt,
      cancelledAt: meetings.cancelledAt,
      createdAt: meetings.createdAt,
      groupName: groups.name,
      community: groups.community,
      facilitatorName: users.displayName,
    })
    .from(meetings)
    .innerJoin(groups, eq(meetings.groupId, groups.id))
    .innerJoin(users, eq(meetings.facilitatorId, users.id))
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!meeting) return c.json({ error: "Meeting not found" }, 404);

  const chaplainRows = meeting.chaplainUserId
    ? await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, meeting.chaplainUserId)).limit(1)
    : [];

  const attendance = await db
    .select({
      id: meetingAttendance.id,
      userId: meetingAttendance.userId,
      status: meetingAttendance.status,
      note: meetingAttendance.note,
      userName: users.displayName,
    })
    .from(meetingAttendance)
    .innerJoin(users, eq(meetingAttendance.userId, users.id))
    .where(eq(meetingAttendance.meetingId, meetingId))
    .orderBy(users.displayName);

  const prayers = await db.select().from(prayerRequests).where(eq(prayerRequests.meetingId, meetingId)).orderBy(prayerRequests.createdAt);

  return c.json({
    meeting: {
      ...meetingResponse(meeting),
      chaplainName: chaplainRows[0]?.displayName ?? null,
      createdAt: meeting.createdAt.toISOString(),
    },
    attendance: attendance.map((record) => ({
      ...record,
    })),
    prayerRequests: prayers.map((prayer) => ({
      id: prayer.id,
      meetingId: prayer.meetingId,
      request: prayer.request,
      status: prayer.status,
      createdAt: prayer.createdAt.toISOString(),
    })),
  });
});

api.put("/meetings/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const meetingId = c.req.param("id");
  const schema = z.object({
    groupId: z.string().uuid().optional(),
    chaplainUserId: z.string().uuid().nullable().optional(),
    chaplainId: z.string().uuid().nullable().optional(),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().nullable().optional(),
    occurredAt: z.string().datetime().nullable().optional(),
    status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    locationName: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    locationCapturedAt: z.string().datetime().nullable().optional(),
    locationSource: z.enum(["manual", "device", "imported"]).nullable().optional(),
    notes: z.string().max(4000).optional(),
    followUpCategory: followUpCategorySchema.optional(),
    followUpNotes: z.string().max(2000).optional(),
  });
  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.groupId !== undefined) update.groupId = body.data.groupId;
  if (body.data.chaplainUserId !== undefined) update.chaplainUserId = body.data.chaplainUserId;
  if (body.data.chaplainId !== undefined) update.chaplainUserId = body.data.chaplainId;
  if (body.data.scheduledStartAt !== undefined) update.scheduledStartAt = new Date(body.data.scheduledStartAt);
  if (body.data.scheduledEndAt !== undefined) update.scheduledEndAt = body.data.scheduledEndAt ? new Date(body.data.scheduledEndAt) : null;
  if (body.data.occurredAt !== undefined) update.occurredAt = body.data.occurredAt ? new Date(body.data.occurredAt) : null;
  if (body.data.status !== undefined) update.status = body.data.status;
  if (body.data.latitude !== undefined) update.latitude = body.data.latitude != null ? String(body.data.latitude) : null;
  if (body.data.longitude !== undefined) update.longitude = body.data.longitude != null ? String(body.data.longitude) : null;
  if (body.data.locationName !== undefined) update.locationName = body.data.locationName;
  if (body.data.address !== undefined) update.address = body.data.address;
  if (body.data.locationCapturedAt !== undefined) update.locationCapturedAt = body.data.locationCapturedAt ? new Date(body.data.locationCapturedAt) : null;
  if (body.data.locationSource !== undefined) update.locationSource = body.data.locationSource;
  if (body.data.notes !== undefined) update.notes = body.data.notes;
  if (body.data.followUpCategory !== undefined) update.followUpCategory = body.data.followUpCategory;
  if (body.data.followUpNotes !== undefined) update.followUpNotes = body.data.followUpNotes;

  await db.update(meetings).set(update).where(eq(meetings.id, meetingId));
  return c.json({ status: "updated" });
});

api.delete("/meetings/:id", async (c) => {
  const { response } = await requireAdmin(c);
  if (response) return response;

  const meetingId = c.req.param("id");
  await db.transaction(async (tx) => {
    await tx.delete(meetingAttendance).where(eq(meetingAttendance.meetingId, meetingId));
    await tx.delete(prayerRequests).where(eq(prayerRequests.meetingId, meetingId));
    await tx.update(mediaAssets).set({ meetingId: null }).where(eq(mediaAssets.meetingId, meetingId));
    await tx.delete(meetings).where(eq(meetings.id, meetingId));
  });

  return c.json({ status: "deleted" });
});

api.get("/meetings/:meetingId/media", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  const meetingId = c.req.param("meetingId");
  const assets = await db.select().from(mediaAssets).where(eq(mediaAssets.meetingId, meetingId)).orderBy(mediaAssets.createdAt);

  const signed = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      type: asset.type,
      url: await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: config.mediaBucketName,
          Key: asset.objectKey,
        }),
        { expiresIn: 300 },
      ),
    })),
  );

  return c.json({ media: signed });
});

api.get("/meetings/:meetingId/prayer-requests", async (c) => {
  const { response } = await requireActor(c);
  if (response) return response;

  const meetingId = c.req.param("meetingId");
  const rows = await db.select().from(prayerRequests).where(eq(prayerRequests.meetingId, meetingId)).orderBy(prayerRequests.createdAt);

  return c.json({
    prayerRequests: rows.map((row) => ({
      id: row.id,
      meetingId: row.meetingId,
      request: row.request,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

app.route("/", api);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Diaconia API listening on http://localhost:${info.port}`);
});
