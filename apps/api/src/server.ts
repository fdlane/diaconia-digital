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
  type CreateMediaUploadResponse,
} from "@diaconia/shared";
import { serve } from "@hono/node-server";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import { authMiddleware, requireAdmin, type AppBindings } from "./auth";
import { loadConfig } from "./config";
import { openApiDocument } from "./openapi";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);
const s3 = new S3Client({ region: config.awsRegion });

const app = new Hono<AppBindings>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:8081", "http://localhost:19006"],
    allowHeaders: ["authorization", "content-type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "diaconia-foundation-api",
    region: config.awsRegion,
  }),
);

app.get("/openapi.json", (c) => c.json(openApiDocument));

app.use("/media/*", authMiddleware(config));
app.use("/sessions", authMiddleware(config));
app.use("/me/*", authMiddleware(config));
app.use("/attendees/*", authMiddleware(config));
app.use("/admin/*", authMiddleware(config));

app.post("/media/uploads", async (c) => {
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

app.post("/sessions", async (c) => {
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

app.get("/admin/sessions", async (c) => {
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
    const selectedColumns = {
      id: sessions.id,
      heldAt: sessions.heldAt,
      notes: sessions.notes,
      followUpCategory: sessions.followUpCategory,
      followUpNotes: sessions.followUpNotes,
      submittedAt: sessions.submittedAt,
      groupName: groups.name,
      community: groups.community,
      facilitatorName: users.displayName,
    };

    const rows = filters.length
      ? await db
          .select(selectedColumns)
          .from(sessions)
          .innerJoin(groups, eq(sessions.groupId, groups.id))
          .innerJoin(users, eq(sessions.facilitatorId, users.id))
          .where(and(...filters))
          .orderBy(desc(sessions.heldAt))
          .limit(100)
      : await db
          .select(selectedColumns)
          .from(sessions)
          .innerJoin(groups, eq(sessions.groupId, groups.id))
          .innerJoin(users, eq(sessions.facilitatorId, users.id))
          .orderBy(desc(sessions.heldAt))
          .limit(100);

    return c.json({
      sessions: rows.map((row) => ({
        ...row,
        heldAt: row.heldAt.toISOString(),
        submittedAt: row.submittedAt?.toISOString() ?? null,
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

app.post("/me/profile-photo", async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json()) as { mediaId?: string };
  if (!body.mediaId) {
    return c.json({ error: "mediaId is required" }, 400);
  }

  const [actor] = await db.select().from(users).where(eq(users.cognitoSub, authUser.sub)).limit(1);
  if (!actor) {
    return c.json({ error: "User profile not found" }, 403);
  }

  await db.update(users).set({ profilePhotoMediaId: body.mediaId }).where(eq(users.id, actor.id));
  await db.insert(auditEvents).values({
    actorUserId: actor.id,
    action: "user_profile_photo_updated",
    entityType: "user",
    entityId: actor.id,
    metadataJson: JSON.stringify({ mediaId: body.mediaId }),
  });

  return c.json({ ok: true });
});

app.post("/attendees/:attendeeId/profile-photo", async (c) => {
  const authUser = c.get("authUser");
  const attendeeId = c.req.param("attendeeId");
  const body = (await c.req.json()) as { mediaId?: string };
  if (!body.mediaId) {
    return c.json({ error: "mediaId is required" }, 400);
  }

  const [actor] = await db.select().from(users).where(eq(users.cognitoSub, authUser.sub)).limit(1);
  if (!actor) {
    return c.json({ error: "User profile not found" }, 403);
  }

  await db.update(attendees).set({ profilePhotoMediaId: body.mediaId }).where(eq(attendees.id, attendeeId));
  await db.insert(auditEvents).values({
    actorUserId: actor.id,
    action: "attendee_profile_photo_updated",
    entityType: "attendee",
    entityId: attendeeId,
    metadataJson: JSON.stringify({ mediaId: body.mediaId }),
  });

  return c.json({ ok: true });
});

app.get("/media/:mediaId/access", async (c) => {
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

app.get("/admin/sessions/:sessionId/media", async (c) => {
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

app.get("/admin/sessions/:sessionId/prayer-requests", async (c) => {
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

app.get("/admin/groups/:groupId/attendees", async (c) => {
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

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Diaconia API listening on http://localhost:${info.port}`);
  },
);
