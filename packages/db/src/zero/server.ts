import { handleGetQueriesRequest, PushProcessor } from "@rocicorp/zero/server";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/drizzle-pg";
import type { ReadonlyJSONValue } from "@rocicorp/zero";
import { z } from "zod";
import type { Database } from "../client.js";
import { groupMemberships, groups, mediaAssets, meetingAttendance, meetings, prayerRequests, users } from "../schema.js";
import type { ZeroAuthContext } from "./context.js";
import { zeroMutators } from "./mutators.js";
import { zeroQueries } from "./queries.js";
import { schema } from "./schema.js";

export type { ZeroAuthContext } from "./context.js";

const mutationCallSchema = z.object({
  namespace: z.string(),
  method: z.string(),
  args: z.record(z.string(), z.unknown()),
});

const mobileMutationEnvelopeSchema = z.object({
  mode: z.literal("mobile-offline-replay"),
  mutations: z.array(mutationCallSchema),
});

export type MobileMutationEnvelope = z.infer<typeof mobileMutationEnvelopeSchema>;

export function createZeroSyncHandlers(db: Database) {
  const dbProvider = zeroNodePg(schema, db as never);
  const pushProcessor = new PushProcessor(dbProvider);

  return {
    query(context: ZeroAuthContext, request: Request | ReadonlyJSONValue) {
      return handleGetQueriesRequest((name, args) => {
        const query = zeroQueries[name];
        if (!query) {
          throw new Error(`Unknown Zero query: ${name}`);
        }

        return { query: query(context, args) };
      }, schema, request);
    },
    mutate(request: Request) {
      return pushProcessor.process(zeroMutators, request);
    },
    async mobileMutate(context: ZeroAuthContext, body: unknown) {
      const envelope = mobileMutationEnvelopeSchema.parse(body);
      await db.transaction(async (tx) => {
        for (const mutation of envelope.mutations) {
          await applyMobileMutationCall(tx, context, mutation);
        }
      });
      return { applied: envelope.mutations.length };
    },
  };
}

type MobileMutationDb = Pick<Database, "insert">;

async function applyMobileMutationCall(
  db: MobileMutationDb,
  context: ZeroAuthContext,
  mutation: z.infer<typeof mutationCallSchema>,
) {
  const args = normalizeArgs(mutation.args);

  switch (`${mutation.namespace}.${mutation.method}`) {
    case "users.upsert": {
      const userArgs = context.role === "admin" ? args : selfUserArgs(context, args);
      requireAdminOrSelf(context, String(userArgs.id));
      await db.insert(users).values(userArgs as never).onConflictDoUpdate({ target: users.id, set: userArgs as never });
      return;
    }
    case "groups.upsert": {
      requireAdminOrStaff(context);
      await db.insert(groups).values(args as never).onConflictDoUpdate({ target: groups.id, set: args as never });
      return;
    }
    case "groupMemberships.upsert": {
      requireAdminOrStaff(context);
      await db.insert(groupMemberships).values(args as never).onConflictDoUpdate({ target: groupMemberships.id, set: args as never });
      return;
    }
    case "meetings.upsert": {
      requireAdminOrStaff(context);
      const meetingArgs = { ...args, facilitatorId: args.facilitatorId ?? context.userId };
      await db.insert(meetings).values(meetingArgs as never).onConflictDoUpdate({ target: meetings.id, set: meetingArgs as never });
      return;
    }
    case "meetingAttendance.upsert": {
      requireAdminOrStaff(context);
      await db.insert(meetingAttendance).values(args as never).onConflictDoUpdate({
        target: [meetingAttendance.meetingId, meetingAttendance.userId],
        set: args as never,
      });
      return;
    }
    case "prayerRequests.upsert": {
      requireAdminOrStaff(context);
      await db.insert(prayerRequests).values(args as never).onConflictDoUpdate({ target: prayerRequests.id, set: args as never });
      return;
    }
    case "mediaAssets.upsert": {
      requireAdminOrStaff(context);
      await db.insert(mediaAssets).values(args as never).onConflictDoUpdate({ target: mediaAssets.id, set: args as never });
      return;
    }
    default:
      throw new Error(`Unknown mobile Zero mutation: ${mutation.namespace}.${mutation.method}`);
  }
}

function normalizeArgs(args: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(args)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, normalizeValue(key, value)]),
  );
}

function normalizeValue(key: string, value: unknown) {
  if (value == null) return value;
  if (key === "latitude" || key === "longitude") return String(value);
  if (key.endsWith("At") && typeof value === "number") return new Date(value);
  return value;
}

function requireAdminOrStaff(context: ZeroAuthContext) {
  if (!["admin", "facilitator", "chaplain"].includes(context.role)) throw new Error("Unauthorized");
}

function selfUserArgs(context: ZeroAuthContext, args: Record<string, unknown>) {
  const allowedSelfFields = new Set(["id", "displayName", "email", "phone", "profilePhotoMediaId", "createdAt", "updatedAt"]);
  const sanitized = Object.fromEntries(Object.entries(args).filter(([key]) => allowedSelfFields.has(key)));
  if (String(sanitized.id) !== context.userId) throw new Error("Unauthorized");
  return sanitized;
}

function requireAdminOrSelf(context: ZeroAuthContext, userId: string) {
  if (context.role !== "admin" && context.userId !== userId) throw new Error("Unauthorized");
}
