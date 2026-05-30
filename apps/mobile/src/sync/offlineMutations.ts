import type { OfflineMutation } from "../offlineStore";

export type ZeroMutationCall = {
  namespace: string;
  method: string;
  args: Record<string, unknown>;
};

export type SyncOfflineMutationsArgs = {
  apiUrl: string;
  token: string;
  mutations: OfflineMutation[];
};

function isoToZeroTimestamp(value: string | null | undefined) {
  return value ? Date.parse(value) : null;
}

function definedEntries(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

export function toZeroMutationCalls(mutation: OfflineMutation): ZeroMutationCall[] {
  switch (mutation.type) {
    case "user.upsert": {
      const now = isoToZeroTimestamp(mutation.user.updatedAt) ?? Date.now();
      return [{
        namespace: "users",
        method: "upsert",
        args: definedEntries({
          id: mutation.user.id,
          authProvider: "clerk",
          authSubject: undefined,
          displayName: mutation.user.displayName,
          email: mutation.user.email ?? null,
          phone: mutation.user.phone ?? "",
          role: mutation.user.role,
          status: mutation.user.status ?? "active",
          profilePhotoMediaId: mutation.user.profilePhotoRemoteMediaId,
          createdAt: now,
          updatedAt: now,
        }),
      }];
    }
    case "group.upsert":
      return [{ namespace: "groups", method: "upsert", args: definedEntries({ ...mutation.group, createdAt: isoToZeroTimestamp(mutation.group.createdAt) ?? Date.now(), updatedAt: isoToZeroTimestamp(mutation.group.updatedAt) ?? Date.now() }) }];
    case "membership.upsert":
      return [{ namespace: "groupMemberships", method: "upsert", args: definedEntries({ ...mutation.membership, joinedAt: isoToZeroTimestamp(mutation.membership.joinedAt) ?? Date.now(), leftAt: isoToZeroTimestamp(mutation.membership.leftAt), createdAt: isoToZeroTimestamp(mutation.membership.createdAt) ?? Date.now(), updatedAt: isoToZeroTimestamp(mutation.membership.updatedAt) ?? Date.now() }) }];
    case "meeting.upsert": {
      const meeting = mutation.meeting;
      const now = Date.now();
      const meetingCall: ZeroMutationCall = {
        namespace: "meetings",
        method: "upsert",
        args: definedEntries({
          id: meeting.id,
          groupId: meeting.groupId,
          facilitatorId: meeting.facilitatorId,
          chaplainUserId: meeting.chaplainUserId ?? null,
          scheduledStartAt: isoToZeroTimestamp(meeting.scheduledStartAt) ?? now,
          scheduledEndAt: isoToZeroTimestamp(meeting.scheduledEndAt),
          occurredAt: isoToZeroTimestamp(meeting.occurredAt),
          status: meeting.status,
          latitude: meeting.latitude,
          longitude: meeting.longitude,
          locationName: meeting.locationName,
          address: meeting.address,
          locationCapturedAt: isoToZeroTimestamp(meeting.locationCapturedAt),
          locationSource: meeting.locationSource,
          notes: meeting.notes,
          followUpCategory: meeting.followUpCategory,
          followUpNotes: meeting.followUpNotes,
          submittedAt: meeting.syncStatus === "draft" ? null : now,
          completedAt: meeting.status === "completed" ? now : null,
          createdAt: now,
          updatedAt: now,
        }),
      };
      const attendanceCalls = Object.entries(meeting.attendance).map(([userId, status]) => ({
        namespace: "meetingAttendance",
        method: "upsert",
        args: { meetingId: meeting.id, userId, status, note: "", createdAt: now, updatedAt: now },
      } satisfies ZeroMutationCall));
      const prayerCalls = meeting.prayerRequests.map((request) => ({
        namespace: "prayerRequests",
        method: "upsert",
        args: { id: request.id, meetingId: meeting.id, request: request.request, status: "open", createdAt: now, updatedAt: now },
      } satisfies ZeroMutationCall));
      return [meetingCall, ...attendanceCalls, ...prayerCalls];
    }
    case "media.upsert":
      return [{ namespace: "mediaAssets", method: "upsert", args: definedEntries({ ...mutation.media, createdAt: isoToZeroTimestamp(mutation.media.createdAt) ?? Date.now() }) }];
  }
}

export function pendingMutationsReadyForSync(mutations: OfflineMutation[]) {
  return mutations.filter((mutation) => mutation.type !== "meeting.upsert" || mutation.meeting.syncStatus !== "draft");
}

export async function syncOfflineMutations({ apiUrl, token, mutations }: SyncOfflineMutationsArgs) {
  const calls = mutations.flatMap(toZeroMutationCalls);
  if (calls.length === 0) return { applied: 0 };

  const response = await fetch(`${apiUrl}/zero/mutate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ mode: "mobile-offline-replay", mutations: calls }),
  });

  if (!response.ok) {
    throw new Error(`Zero mutation replay failed with ${response.status}`);
  }

  return response.json() as Promise<{ applied: number }>;
}
