import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  attendanceRecords,
  attendees,
  auditEvents,
  createDatabase,
  groups,
  mediaAssets,
  prayerRequests,
  sessions,
  users,
} from "@diaconia/db";
import {
  createMediaUploadInputSchema,
  createSessionInputSchema,
  followUpCategorySchema,
  type CreateMediaUploadResponse,
} from "@diaconia/shared";
import { serve } from "@hono/node-server";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createUserSchema,
  updateUserSchema,
  validateRole,
} from "./adminValidation.js";
import { authMiddleware, requireAdmin, type AppBindings } from "./auth.js";
import { loadConfig } from "./config.js";
import { openApiDocument } from "./openapi.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const s3 = new S3Client({ region: config.awsRegion });

const profilePhotoBodySchema = z.object({ mediaId: z.string().uuid() });

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

api.use("/media/*", authMiddleware(config));
api.use("/sessions", authMiddleware(config));
api.use("/me/*", authMiddleware(config));
api.use("/attendees/*", authMiddleware(config));
api.use("/admin/*", authMiddleware(config));

api.post("/media/uploads", async (c) => {
  const body = createMediaUploadInputSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json({ error: "Invalid upload request", details: body.error.flatten() }, 400);
  }

  const mediaId = randomUUID();
  const extension = body.data.contentType.split("/")[1] ?? "jpg";
  const objectKey = `foundation/${body.data.type}/${mediaId}.${extension}`;

  await db.insert(mediaAssets).values({
    id: mediaId,
    type: body.data.type,
    ownerUserId: body.data.ownerUserId ?? null,
    attendeeId: body.data.attendeeId ?? null,
    sessionId: body.data.sessionId ?? null,
    objectKey,
    contentType: body.data.contentType,
    byteSize: body.data.byteSize,
  });

  const authUser = c.get("authUser");
  const [actor] = await db.select().from(users).where(eq(users.cognitoSub, authUser.sub)).limit(1);

  await db.insert(auditEvents).values({
    actorUserId: actor?.id ?? body.data.ownerUserId ?? null,
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

  const response: CreateMediaUploadResponse = {
    mediaId,
    objectKey,
    uploadUrl,
    headers: {
      "content-type": body.data.contentType,
      "x-amz-server-side-encryption": "aws:kms",
    },
  };

  return c.json(response);
});

api.post("/sessions", async (c) => {
  const authUser = c.get("authUser");
  const body = createSessionInputSchema.safeParse(await c.req.json());

  if (!body.success) {
    return c.json({ error: "Invalid session", details: body.error.flatten() }, 400);
  }

  const [facilitator] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, authUser.sub))
    .limit(1);

  if (!facilitator) {
    return c.json({ error: "Facilitator profile not found" }, 403);
  }

  const [existingSession] = await db
    .select({ facilitatorId: sessions.facilitatorId })
    .from(sessions)
    .where(eq(sessions.id, body.data.id))
    .limit(1);

  if (existingSession && existingSession.facilitatorId !== facilitator.id) {
    return c.json({ error: "Session id already belongs to another facilitator" }, 409);
  }

  const attendeeIds = Array.from(
    new Set([
      ...body.data.attendance.map((record) => record.attendeeId),
      ...body.data.prayerRequests.flatMap((request) => (request.attendeeId ? [request.attendeeId] : [])),
    ]),
  );

  if (attendeeIds.length) {
    const knownAttendees = await db
      .select({ id: attendees.id, groupId: attendees.groupId })
      .from(attendees)
      .where(inArray(attendees.id, attendeeIds));
    const knownById = new Map(knownAttendees.map((attendee) => [attendee.id, attendee]));
    const invalidAttendeeIds = attendeeIds.filter(
      (attendeeId) => knownById.get(attendeeId)?.groupId !== body.data.groupId,
    );

    if (invalidAttendeeIds.length) {
      return c.json({ error: "Session contains attendees outside the selected group", attendeeIds: invalidAttendeeIds }, 400);
    }
  }

  if (body.data.meetingPhotoMediaIds.length) {
    const mediaRows = await db
      .select({ id: mediaAssets.id, sessionId: mediaAssets.sessionId, type: mediaAssets.type })
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, body.data.meetingPhotoMediaIds));
    const mediaById = new Map(mediaRows.map((asset) => [asset.id, asset]));
    const invalidMediaIds = body.data.meetingPhotoMediaIds.filter((mediaId) => {
      const asset = mediaById.get(mediaId);
      return !asset || asset.type !== "meeting_photo" || (asset.sessionId && asset.sessionId !== body.data.id);
    });

    if (invalidMediaIds.length) {
      return c.json({ error: "Session contains invalid meeting photo media", mediaIds: invalidMediaIds }, 400);
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(sessions)
      .values({
        id: body.data.id,
        groupId: body.data.groupId,
        facilitatorId: facilitator.id,
        heldAt: new Date(body.data.heldAt),
        notes: body.data.notes,
        followUpCategory: body.data.followUpCategory,
        followUpNotes: body.data.followUpNotes,
        submittedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          groupId: body.data.groupId,
          facilitatorId: facilitator.id,
          heldAt: new Date(body.data.heldAt),
          notes: body.data.notes,
          followUpCategory: body.data.followUpCategory,
          followUpNotes: body.data.followUpNotes,
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    for (const record of body.data.attendance) {
      await tx
        .insert(attendanceRecords)
        .values({
          sessionId: body.data.id,
          attendeeId: record.attendeeId,
          status: record.status,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.sessionId, attendanceRecords.attendeeId],
          set: {
            status: record.status,
            updatedAt: new Date(),
          },
        });
    }

    for (const prayer of body.data.prayerRequests) {
      await tx
        .insert(prayerRequests)
        .values({
          id: prayer.id,
          sessionId: body.data.id,
          attendeeId: prayer.attendeeId ?? null,
          requesterName: prayer.requesterName,
          request: prayer.request,
          status: "open",
        })
        .onConflictDoUpdate({
          target: prayerRequests.id,
          set: {
            attendeeId: prayer.attendeeId ?? null,
            requesterName: prayer.requesterName,
            request: prayer.request,
            status: "open",
            updatedAt: new Date(),
          },
        });
    }

    if (body.data.meetingPhotoMediaIds.length) {
      await tx
        .update(mediaAssets)
        .set({ sessionId: body.data.id })
        .where(inArray(mediaAssets.id, body.data.meetingPhotoMediaIds));
    }

    await tx.insert(auditEvents).values({
      actorUserId: facilitator.id,
      action: "session_submitted",
      entityType: "session",
      entityId: body.data.id,
      metadataJson: JSON.stringify({
        attendanceCount: body.data.attendance.length,
        meetingPhotoCount: body.data.meetingPhotoMediaIds.length,
      }),
    });
  });

  return c.json({ id: body.data.id, status: "accepted" }, 201);
});

api.get("/admin/sessions", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) {
    return forbidden;
  }

  const facilitatorId = c.req.query("facilitatorId");
  const groupId = c.req.query("groupId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const filters = [
    facilitatorId ? eq(sessions.facilitatorId, facilitatorId) : undefined,
    groupId ? eq(sessions.groupId, groupId) : undefined,
    from ? gte(sessions.heldAt, new Date(from)) : undefined,
    to ? lte(sessions.heldAt, new Date(to)) : undefined,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));

  try {
    const facilitators = users;
    const selectedColumns = {
      id: sessions.id,
      heldAt: sessions.heldAt,
      notes: sessions.notes,
      followUpCategory: sessions.followUpCategory,
      followUpNotes: sessions.followUpNotes,
      submittedAt: sessions.submittedAt,
      chaplainId: sessions.chaplainId,
      latitude: sessions.latitude,
      longitude: sessions.longitude,
      groupName: groups.name,
      community: groups.community,
      facilitatorName: facilitators.displayName,
    };

    const rows = filters.length
      ? await db
          .select(selectedColumns)
          .from(sessions)
          .innerJoin(groups, eq(sessions.groupId, groups.id))
          .innerJoin(facilitators, eq(sessions.facilitatorId, facilitators.id))
          .where(and(...filters))
          .orderBy(desc(sessions.heldAt))
          .limit(100)
      : await db
          .select(selectedColumns)
          .from(sessions)
          .innerJoin(groups, eq(sessions.groupId, groups.id))
          .innerJoin(facilitators, eq(sessions.facilitatorId, facilitators.id))
          .orderBy(desc(sessions.heldAt))
          .limit(100);

    return c.json({
      sessions: rows.map((row) => ({
        ...row,
        heldAt: row.heldAt.toISOString(),
        submittedAt: row.submittedAt?.toISOString() ?? null,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
      })),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown database error";
    console.error("admin_sessions_query_failed", error);

    if (process.env.NODE_ENV !== "production") {
      return c.json({
        sessions: [],
        warning: `Database is not ready for admin sessions: ${detail}`,
      });
    }

    return c.json({ error: "Admin sessions are unavailable" }, 503);
  }
});

api.post("/me/profile-photo", async (c) => {
  const authUser = c.get("authUser");
  const bodyResult = profilePhotoBodySchema.safeParse(await c.req.json());
  if (!bodyResult.success) {
    return c.json({ error: "mediaId is required and must be a valid UUID" }, 400);
  }
  const { mediaId } = bodyResult.data;

  const [actor] = await db.select().from(users).where(eq(users.cognitoSub, authUser.sub)).limit(1);
  if (!actor) {
    return c.json({ error: "User profile not found" }, 403);
  }

  const [asset] = await db
    .select({ ownerUserId: mediaAssets.ownerUserId, type: mediaAssets.type })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId))
    .limit(1);

  if (!asset || asset.ownerUserId !== actor.id || asset.type !== "user_profile_photo") {
    return c.json({ error: "Media not found or not owned by user" }, 403);
  }

  await db.update(users).set({ profilePhotoMediaId: mediaId }).where(eq(users.id, actor.id));
  await db.insert(auditEvents).values({
    actorUserId: actor.id,
    action: "user_profile_photo_updated",
    entityType: "user",
    entityId: actor.id,
    metadataJson: JSON.stringify({ mediaId }),
  });

  return c.json({ ok: true });
});

api.post("/attendees/:attendeeId/profile-photo", async (c) => {
  const authUser = c.get("authUser");
  const attendeeId = c.req.param("attendeeId");
  const bodyResult = profilePhotoBodySchema.safeParse(await c.req.json());
  if (!bodyResult.success) {
    return c.json({ error: "mediaId is required and must be a valid UUID" }, 400);
  }
  const { mediaId } = bodyResult.data;

  const [actor] = await db.select().from(users).where(eq(users.cognitoSub, authUser.sub)).limit(1);
  if (!actor) {
    return c.json({ error: "User profile not found" }, 403);
  }

  const [attendee] = await db
    .select({ groupId: attendees.groupId })
    .from(attendees)
    .where(eq(attendees.id, attendeeId))
    .limit(1);

  if (!attendee) {
    return c.json({ error: "Attendee not found" }, 404);
  }

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, attendee.groupId), eq(groups.facilitatorId, actor.id)))
    .limit(1);

  if (!group) {
    return c.json({ error: "Not authorized to update this attendee" }, 403);
  }

  const [asset] = await db
    .select({ attendeeId: mediaAssets.attendeeId, type: mediaAssets.type })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId))
    .limit(1);

  if (!asset || asset.attendeeId !== attendeeId || asset.type !== "attendee_profile_photo") {
    return c.json({ error: "Media not found or not associated with attendee" }, 403);
  }

  await db.update(attendees).set({ profilePhotoMediaId: mediaId }).where(eq(attendees.id, attendeeId));
  await db.insert(auditEvents).values({
    actorUserId: actor.id,
    action: "attendee_profile_photo_updated",
    entityType: "attendee",
    entityId: attendeeId,
    metadataJson: JSON.stringify({ mediaId }),
  });

  return c.json({ ok: true });
});

api.get("/media/:mediaId/access", async (c) => {
  const mediaId = c.req.param("mediaId");
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
  if (!asset) {
    return c.json({ error: "Media not found" }, 404);
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: config.mediaBucketName,
      Key: asset.objectKey,
    }),
    { expiresIn: 300 },
  );

  return c.json({
    id: asset.id,
    type: asset.type,
    url,
    contentType: asset.contentType,
  });
});

api.get("/admin/sessions/:sessionId/media", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) {
    return forbidden;
  }

  const sessionId = c.req.param("sessionId");
  const assets = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.sessionId, sessionId))
    .orderBy(mediaAssets.createdAt);

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

api.get("/admin/sessions/:sessionId/prayer-requests", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) {
    return forbidden;
  }

  const sessionId = c.req.param("sessionId");
  const rows = await db
    .select()
    .from(prayerRequests)
    .where(eq(prayerRequests.sessionId, sessionId))
    .orderBy(prayerRequests.createdAt);

  return c.json({
    prayerRequests: rows.map((row) => ({
      id: row.id,
      attendeeId: row.attendeeId,
      requesterName: row.requesterName,
      request: row.request,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

api.get("/admin/groups/:groupId/attendees", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) {
    return forbidden;
  }

  const groupId = c.req.param("groupId");
  const rows = await db
    .select()
    .from(attendees)
    .where(eq(attendees.groupId, groupId))
    .orderBy(attendees.displayName);

  return c.json({ attendees: rows });
});

api.post("/admin/groups/:groupId/attendees", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const groupId = c.req.param("groupId");
  const [group] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group) return c.json({ error: "Group not found" }, 404);

  const schema = z.object({
    displayName: z.string().min(1),
    phone: z.string().min(4).nullable().optional(),
    position: z.enum(["president", "secretary", "treasurer"]).nullable().optional(),
  });

  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const attendeeId = randomUUID();
  await db.insert(attendees).values({
    id: attendeeId,
    groupId,
    displayName: body.data.displayName,
    phone: body.data.phone ?? null,
    position: body.data.position ?? null,
  });

  return c.json({ id: attendeeId, status: "created" }, 201);
});

api.put("/admin/groups/:groupId/attendees/:attendeeId", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const groupId = c.req.param("groupId");
  const attendeeId = c.req.param("attendeeId");

  const [existing] = await db
    .select({ id: attendees.id })
    .from(attendees)
    .where(and(eq(attendees.id, attendeeId), eq(attendees.groupId, groupId)))
    .limit(1);
  if (!existing) return c.json({ error: "Attendee not found" }, 404);

  const schema = z.object({
    displayName: z.string().min(1).optional(),
    phone: z.string().min(4).nullable().optional(),
    position: z.enum(["president", "secretary", "treasurer"]).nullable().optional(),
    active: z.boolean().optional(),
  });

  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  await db.update(attendees).set({ ...body.data, updatedAt: new Date() }).where(eq(attendees.id, attendeeId));
  return c.json({ status: "updated" });
});

/* ── Admin: Users CRUD ─────────────────────────────────── */

api.get("/admin/users", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  try {
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        cognitoSub: users.cognitoSub,
        createdAt: users.createdAt,
        groupId: groups.id,
        groupName: groups.name,
        community: groups.community,
        sessionCount: sql<number>`cast(count(distinct ${sessions.id}) as integer)`,
      })
      .from(users)
      .leftJoin(groups, eq(groups.facilitatorId, users.id))
      .leftJoin(sessions, eq(sessions.facilitatorId, users.id))
      .groupBy(users.id, groups.id)
      .orderBy(users.displayName);

    return c.json({
      users: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("admin_users_query_failed", error);
    if (process.env.NODE_ENV !== "production") {
      return c.json({ users: [], warning: `Database not ready: ${detail}` });
    }
    return c.json({ error: "Failed to list users" }, 503);
  }
});

api.get("/admin/users/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const userId = c.req.param("id");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: "User not found" }, 404);

  const userGroups = await db.select().from(groups).where(eq(groups.facilitatorId, userId));

  const countRows = await db
    .select({ sessionCount: sql<number>`cast(count(*) as integer)` })
    .from(sessions)
    .where(eq(sessions.facilitatorId, userId));
  const sessionCount = countRows[0]?.sessionCount ?? 0;

  return c.json({
    user: {
      id: user.id,
      cognitoSub: user.cognitoSub,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    groups: userGroups.map((g) => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })),
    sessionCount,
  });
});

api.post("/admin/users", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const body = createUserSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const userId = randomUUID();
  const cognitoSub = body.data.cognitoSub ?? `admin-created:${userId}`;

  if (body.data.cognitoSub) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub))
      .limit(1);
    if (existing) return c.json({ error: "Cognito sub already in use" }, 409);
  }

  await db.insert(users).values({
    id: userId,
    cognitoSub,
    displayName: body.data.displayName,
    email: body.data.email ?? null,
    phone: body.data.phone ?? null,
    role: body.data.role,
  });

  return c.json({ id: userId, status: "created" }, 201);
});

api.put("/admin/users/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const userId = c.req.param("id");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return c.json({ error: "User not found" }, 404);

  const body = updateUserSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  await db.update(users).set({ ...body.data, updatedAt: new Date() }).where(eq(users.id, userId));
  return c.json({ status: "updated" });
});

api.delete("/admin/users/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const userId = c.req.param("id");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return c.json({ error: "User not found" }, 404);

  const [hasGroup] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.facilitatorId, userId))
    .limit(1);
  if (hasGroup) return c.json({ error: "Cannot delete a user who facilitates a group" }, 409);

  const [hasSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.facilitatorId, userId))
    .limit(1);
  if (hasSession) return c.json({ error: "Cannot delete a user who has submitted sessions" }, 409);

  await db.delete(users).where(eq(users.id, userId));
  return c.json({ status: "deleted" });
});

/* ── Admin: Single Session Detail + Update + Delete ────── */

api.get("/admin/sessions/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const sessionId = c.req.param("id");

  const facilitators = users;
  const [session] = await db
    .select({
      id: sessions.id,
      groupId: sessions.groupId,
      facilitatorId: sessions.facilitatorId,
      chaplainId: sessions.chaplainId,
      heldAt: sessions.heldAt,
      latitude: sessions.latitude,
      longitude: sessions.longitude,
      notes: sessions.notes,
      followUpCategory: sessions.followUpCategory,
      followUpNotes: sessions.followUpNotes,
      submittedAt: sessions.submittedAt,
      createdAt: sessions.createdAt,
      groupName: groups.name,
      community: groups.community,
      facilitatorName: facilitators.displayName,
    })
    .from(sessions)
    .innerJoin(groups, eq(sessions.groupId, groups.id))
    .innerJoin(facilitators, eq(sessions.facilitatorId, facilitators.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return c.json({ error: "Session not found" }, 404);

  const chaplainRows = session.chaplainId
    ? await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, session.chaplainId))
        .limit(1)
    : [];

  const attendance = await db
    .select({
      id: attendanceRecords.id,
      attendeeId: attendanceRecords.attendeeId,
      status: attendanceRecords.status,
      attendeeName: attendees.displayName,
    })
    .from(attendanceRecords)
    .innerJoin(attendees, eq(attendanceRecords.attendeeId, attendees.id))
    .where(eq(attendanceRecords.sessionId, sessionId))
    .orderBy(attendees.displayName);

  const prayers = await db
    .select()
    .from(prayerRequests)
    .where(eq(prayerRequests.sessionId, sessionId))
    .orderBy(prayerRequests.createdAt);

  return c.json({
    session: {
      ...session,
      chaplainName: chaplainRows[0]?.displayName ?? null,
      heldAt: session.heldAt.toISOString(),
      submittedAt: session.submittedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      latitude: session.latitude ? parseFloat(session.latitude) : null,
      longitude: session.longitude ? parseFloat(session.longitude) : null,
    },
    attendance,
    prayerRequests: prayers.map((pr) => ({
      id: pr.id,
      attendeeId: pr.attendeeId,
      requesterName: pr.requesterName,
      request: pr.request,
      status: pr.status,
      createdAt: pr.createdAt.toISOString(),
    })),
  });
});

api.post("/admin/sessions", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const schema = z.object({
    groupId: z.string().uuid(),
    chaplainId: z.string().uuid().nullable().optional(),
    heldAt: z.string().datetime(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    notes: z.string().max(4000).default(""),
    followUpCategory: followUpCategorySchema.default("none"),
    followUpNotes: z.string().max(2000).default(""),
  });

  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const [group] = await db.select().from(groups).where(eq(groups.id, body.data.groupId)).limit(1);
  if (!group) return c.json({ error: "Group not found" }, 404);

  if (body.data.chaplainId) {
    const [chaplain] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.data.chaplainId)).limit(1);
    if (!chaplain) return c.json({ error: "Chaplain not found" }, 404);
  }

  const sessionId = randomUUID();
  await db.insert(sessions).values({
    id: sessionId,
    groupId: body.data.groupId,
    facilitatorId: group.facilitatorId,
    chaplainId: body.data.chaplainId ?? null,
    heldAt: new Date(body.data.heldAt),
    latitude: body.data.latitude != null ? String(body.data.latitude) : null,
    longitude: body.data.longitude != null ? String(body.data.longitude) : null,
    notes: body.data.notes,
    followUpCategory: body.data.followUpCategory,
    followUpNotes: body.data.followUpNotes,
    submittedAt: new Date(),
  });

  return c.json({ id: sessionId, status: "created" }, 201);
});

api.put("/admin/sessions/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const sessionId = c.req.param("id");
  const [existing] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!existing) return c.json({ error: "Session not found" }, 404);

  const schema = z.object({
    groupId: z.string().uuid().optional(),
    chaplainId: z.string().uuid().nullable().optional(),
    heldAt: z.string().datetime().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    notes: z.string().max(4000).optional(),
    followUpCategory: followUpCategorySchema.optional(),
    followUpNotes: z.string().max(2000).optional(),
  });

  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  if (body.data.chaplainId) {
    const [chaplain] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.data.chaplainId)).limit(1);
    if (!chaplain) return c.json({ error: "Chaplain not found" }, 404);
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.groupId !== undefined) update.groupId = body.data.groupId;
  if (body.data.chaplainId !== undefined) update.chaplainId = body.data.chaplainId;
  if (body.data.heldAt !== undefined) update.heldAt = new Date(body.data.heldAt);
  if (body.data.latitude !== undefined) update.latitude = body.data.latitude != null ? String(body.data.latitude) : null;
  if (body.data.longitude !== undefined) update.longitude = body.data.longitude != null ? String(body.data.longitude) : null;
  if (body.data.notes !== undefined) update.notes = body.data.notes;
  if (body.data.followUpCategory !== undefined) update.followUpCategory = body.data.followUpCategory;
  if (body.data.followUpNotes !== undefined) update.followUpNotes = body.data.followUpNotes;

  await db.update(sessions).set(update).where(eq(sessions.id, sessionId));
  return c.json({ status: "updated" });
});

api.delete("/admin/sessions/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const sessionId = c.req.param("id");
  const [existing] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!existing) return c.json({ error: "Session not found" }, 404);

  await db.transaction(async (tx) => {
    await tx.delete(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId));
    await tx.delete(prayerRequests).where(eq(prayerRequests.sessionId, sessionId));
    await tx.update(mediaAssets).set({ sessionId: null }).where(eq(mediaAssets.sessionId, sessionId));
    await tx.delete(sessions).where(eq(sessions.id, sessionId));
  });

  return c.json({ status: "deleted" });
});

/* ── Admin: Chaplains list ─────────────────────────────── */

api.get("/admin/chaplains", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const rows = await db
    .select({ id: users.id, displayName: users.displayName, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.role, "chaplain"))
    .orderBy(users.displayName);

  return c.json({ chaplains: rows });
});

/* ── Admin: Groups CRUD ────────────────────────────────── */

api.get("/admin/groups/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

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
      chaplainId: groups.chaplainId,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .innerJoin(users, eq(groups.facilitatorId, users.id))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) return c.json({ error: "Group not found" }, 404);

  const chaplainRows = group.chaplainId
    ? await db
        .select({ displayName: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, group.chaplainId))
        .limit(1)
    : [];

  const countRows = await db
    .select({ sessionCount: sql<number>`cast(count(*) as integer)` })
    .from(sessions)
    .where(eq(sessions.groupId, groupId));

  const groupAttendees = await db
    .select({
      id: attendees.id,
      displayName: attendees.displayName,
      phone: attendees.phone,
      position: attendees.position,
      active: attendees.active,
    })
    .from(attendees)
    .where(eq(attendees.groupId, groupId))
    .orderBy(attendees.displayName);

  return c.json({
    group: {
      ...group,
      chaplainName: chaplainRows[0]?.displayName ?? null,
      chaplainEmail: chaplainRows[0]?.email ?? null,
      createdAt: group.createdAt.toISOString(),
    },
    sessionCount: countRows[0]?.sessionCount ?? 0,
    attendees: groupAttendees,
  });
});

api.get("/admin/groups", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  try {
    const facilitators = users;
    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        community: groups.community,
        active: groups.active,
        facilitatorId: groups.facilitatorId,
        facilitatorName: facilitators.displayName,
        chaplainId: groups.chaplainId,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .innerJoin(facilitators, eq(groups.facilitatorId, facilitators.id))
      .orderBy(groups.name);

    return c.json({ groups: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("admin_groups_query_failed", error);
    if (process.env.NODE_ENV !== "production") {
      return c.json({ groups: [], warning: `Database not ready: ${detail}` });
    }
    return c.json({ error: "Failed to list groups" }, 503);
  }
});

api.post("/admin/groups", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const schema = z.object({
    name: z.string().min(1),
    community: z.string().min(1),
    facilitatorId: z.string().uuid(),
    chaplainId: z.string().uuid().nullable().optional(),
    active: z.boolean().default(true),
  });

  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  const [facilitator] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, body.data.facilitatorId))
    .limit(1);
  if (!facilitator) return c.json({ error: "Facilitator not found" }, 404);
  const facilitatorRoleError = validateRole(facilitator, "facilitator", "Facilitator");
  if (facilitatorRoleError) return c.json({ error: facilitatorRoleError }, 400);

  if (body.data.chaplainId) {
    const [chaplain] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, body.data.chaplainId))
      .limit(1);
    if (!chaplain) return c.json({ error: "Chaplain not found" }, 404);
    const chaplainRoleError = validateRole(chaplain, "chaplain", "Chaplain");
    if (chaplainRoleError) return c.json({ error: chaplainRoleError }, 400);
  }

  const groupId = randomUUID();
  await db.insert(groups).values({
    id: groupId,
    name: body.data.name,
    community: body.data.community,
    facilitatorId: body.data.facilitatorId,
    chaplainId: body.data.chaplainId ?? null,
    active: body.data.active,
  });

  return c.json({ id: groupId, status: "created" }, 201);
});

api.put("/admin/groups/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const groupId = c.req.param("id");
  const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!existing) return c.json({ error: "Group not found" }, 404);

  const schema = z.object({
    name: z.string().min(1).optional(),
    community: z.string().min(1).optional(),
    facilitatorId: z.string().uuid().optional(),
    chaplainId: z.string().uuid().nullable().optional(),
    active: z.boolean().optional(),
  });

  const body = schema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "Invalid request", details: body.error.flatten() }, 400);

  if (body.data.facilitatorId) {
    const [facilitator] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, body.data.facilitatorId))
      .limit(1);
    if (!facilitator) return c.json({ error: "Facilitator not found" }, 404);
    const facilitatorRoleError = validateRole(facilitator, "facilitator", "Facilitator");
    if (facilitatorRoleError) return c.json({ error: facilitatorRoleError }, 400);
  }

  if (body.data.chaplainId) {
    const [chaplain] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, body.data.chaplainId))
      .limit(1);
    if (!chaplain) return c.json({ error: "Chaplain not found" }, 404);
    const chaplainRoleError = validateRole(chaplain, "chaplain", "Chaplain");
    if (chaplainRoleError) return c.json({ error: chaplainRoleError }, 400);
  }

  await db.update(groups).set({ ...body.data, updatedAt: new Date() }).where(eq(groups.id, groupId));
  return c.json({ status: "updated" });
});

api.delete("/admin/groups/:id", async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const groupId = c.req.param("id");
  const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!existing) return c.json({ error: "Group not found" }, 404);

  await db.update(groups).set({ active: false, updatedAt: new Date() }).where(eq(groups.id, groupId));
  return c.json({ status: "deactivated" });
});

app.route("/", api);
app.route("/api", api);

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Diaconia API listening on http://localhost:${info.port}`);
  },
);
