import type { OfflineMutation } from "../offlineStore";

export type ZeroMutationCall = {
  namespace: string;
  method: string;
  args: Record<string, unknown>;
};

function isoToZeroTimestamp(value: string | null | undefined) {
  return value ? Date.parse(value) : null;
}

function definedEntries(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

export function toZeroMutationCalls(mutation: OfflineMutation): ZeroMutationCall[] {
  switch (mutation.type) {
    case "user.upsert":
      return [{ namespace: "users", method: "create", args: definedEntries({ ...mutation.user, updatedAt: isoToZeroTimestamp(mutation.user.updatedAt) ?? Date.now() }) }];
    case "group.upsert":
      return [{ namespace: "groups", method: "create", args: definedEntries({ ...mutation.group, createdAt: isoToZeroTimestamp(mutation.group.createdAt) ?? Date.now(), updatedAt: isoToZeroTimestamp(mutation.group.updatedAt) ?? Date.now() }) }];
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
          facilitatorId: "__current_user__",
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
        args: { id: `${meeting.id}-${userId}`, meetingId: meeting.id, userId, status, note: "", createdAt: now, updatedAt: now },
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
