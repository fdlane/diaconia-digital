import type { AttendanceStatus, FollowUpCategory, LocationSource, MeetingStatus, Role } from "@diaconia/shared";
import type { LocalGroup, LocalMeeting, LocalMember, LocalPhoto, LocalPrayerRequest, LocalUser } from "./types";

export type SyncState = "local" | "pending" | "synced" | "failed";

export type OfflineUser = LocalUser & {
  authProvider?: string;
  authSubject?: string | null;
  pendingProfilePhoto?: LocalPhoto;
  updatedAt?: string;
  syncState?: SyncState;
};

export type OfflineGroup = LocalGroup & {
  active: boolean;
  profilePhotoUri?: string;
  profilePhotoRemoteMediaId?: string;
  createdAt?: string;
  updatedAt?: string;
  syncState?: SyncState;
};

export type OfflineMembership = {
  id: string;
  groupId: string;
  userId: string;
  position?: "president" | "secretary" | "treasurer" | null;
  active: boolean;
  joinedAt: string;
  leftAt?: string | null;
  createdAt: string;
  updatedAt: string;
  syncState?: SyncState;
};

export type OfflineMediaAsset = {
  id: string;
  type: LocalPhoto["type"];
  ownerUserId?: string | null;
  groupId?: string | null;
  meetingId?: string | null;
  objectKey: string;
  contentType: string;
  byteSize: number;
  checksumSha256?: string | null;
  localUri?: string;
  uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
  createdAt: string;
};

export type OfflineMutation =
  | { type: "user.upsert"; user: OfflineUser }
  | { type: "group.upsert"; group: OfflineGroup }
  | { type: "membership.upsert"; membership: OfflineMembership }
  | { type: "meeting.upsert"; meeting: LocalMeeting }
  | { type: "media.upsert"; media: OfflineMediaAsset };

export type MobileOfflineSnapshot = {
  users: OfflineUser[];
  groups: OfflineGroup[];
  memberships: OfflineMembership[];
  meetings: LocalMeeting[];
  mediaAssets: OfflineMediaAsset[];
  pendingMutations: OfflineMutation[];
  lastHydratedAt?: string;
};

export type CanonicalMeetingInput = {
  id: string;
  groupId: string;
  facilitatorId: string;
  chaplainUserId?: string | null;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  occurredAt?: string | null;
  status: MeetingStatus;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  address?: string | null;
  locationCapturedAt?: string | null;
  locationSource?: LocationSource | null;
  notes: string;
  followUpCategory: FollowUpCategory;
  followUpNotes: string;
  attendance: Record<string, AttendanceStatus>;
  prayerRequests: LocalPrayerRequest[];
  meetingPhotos: LocalPhoto[];
  syncStatus?: LocalMeeting["syncStatus"];
};

export function createEmptySnapshot(): MobileOfflineSnapshot {
  return { users: [], groups: [], memberships: [], meetings: [], mediaAssets: [], pendingMutations: [] };
}

export function bootstrapSnapshot({
  users,
  groups,
  memberships,
  meetings = [],
}: {
  users: OfflineUser[];
  groups: OfflineGroup[];
  memberships: OfflineMembership[];
  meetings?: LocalMeeting[];
}): MobileOfflineSnapshot {
  return {
    users: dedupeById(users),
    groups: dedupeById(groups),
    memberships: dedupeById(memberships),
    meetings: dedupeById(meetings),
    mediaAssets: [],
    pendingMutations: [],
    lastHydratedAt: new Date().toISOString(),
  };
}

export function selectLocalGroups(snapshot: MobileOfflineSnapshot): LocalGroup[] {
  return snapshot.groups.filter((group) => group.active).map(({ syncState, active, ...group }) => group);
}

export function selectLocalMembers(snapshot: MobileOfflineSnapshot, groupId?: string): LocalMember[] {
  const activeMemberships = snapshot.memberships.filter((membership) => membership.active && (!groupId || membership.groupId === groupId));
  return activeMemberships
    .flatMap((membership) => {
      const user = snapshot.users.find((candidate) => candidate.id === membership.userId && candidate.status !== "disabled");
      if (!user) return [];
      const member: LocalMember = {
        id: user.id,
        groupId: membership.groupId,
        displayName: user.displayName,
        email: user.email ?? null,
        role: user.role,
        position: membership.position ?? null,
        ...(user.phone ? { phone: user.phone } : {}),
        ...(user.profilePhotoUri ? { profilePhotoUri: user.profilePhotoUri } : {}),
        ...(user.profilePhotoRemoteMediaId ? { profilePhotoRemoteMediaId: user.profilePhotoRemoteMediaId } : {}),
      };
      return [member];
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function enqueueMutation(snapshot: MobileOfflineSnapshot, mutation: OfflineMutation): MobileOfflineSnapshot {
  const next = applyMutation(snapshot, mutation);
  return {
    ...next,
    pendingMutations: [...next.pendingMutations, mutation],
  };
}

export function applyMutation(snapshot: MobileOfflineSnapshot, mutation: OfflineMutation): MobileOfflineSnapshot {
  switch (mutation.type) {
    case "user.upsert":
      return { ...snapshot, users: upsertById(snapshot.users, { ...mutation.user, syncState: mutation.user.syncState ?? "pending" }) };
    case "group.upsert":
      return { ...snapshot, groups: upsertById(snapshot.groups, { ...mutation.group, syncState: mutation.group.syncState ?? "pending" }) };
    case "membership.upsert":
      return { ...snapshot, memberships: upsertById(snapshot.memberships, { ...mutation.membership, syncState: mutation.membership.syncState ?? "pending" }) };
    case "meeting.upsert":
      return { ...snapshot, meetings: upsertById(snapshot.meetings, { ...mutation.meeting, syncStatus: mutation.meeting.syncStatus ?? "pending" }) };
    case "media.upsert":
      return { ...snapshot, mediaAssets: upsertById(snapshot.mediaAssets, mutation.media) };
  }
}

export function markMutationBatchSynced(snapshot: MobileOfflineSnapshot, syncedMutations: OfflineMutation[]): MobileOfflineSnapshot {
  const syncedKeys = new Set(syncedMutations.map(mutationKey));
  return {
    ...snapshot,
    users: snapshot.users.map((item) => syncedKeys.has(`user.upsert:${item.id}`) ? { ...item, syncState: "synced" } : item),
    groups: snapshot.groups.map((item) => syncedKeys.has(`group.upsert:${item.id}`) ? { ...item, syncState: "synced" } : item),
    memberships: snapshot.memberships.map((item) => syncedKeys.has(`membership.upsert:${item.id}`) ? { ...item, syncState: "synced" } : item),
    meetings: snapshot.meetings.map((item) => syncedKeys.has(`meeting.upsert:${item.id}`) ? { ...item, syncStatus: "synced" } : item),
    mediaAssets: snapshot.mediaAssets.map((item) => syncedKeys.has(`media.upsert:${item.id}`) ? { ...item, uploadStatus: "uploaded" } : item),
    pendingMutations: snapshot.pendingMutations.filter((mutation) => !syncedKeys.has(mutationKey(mutation))),
  };
}

export function markPendingMutationsSynced(snapshot: MobileOfflineSnapshot): MobileOfflineSnapshot {
  return markMutationBatchSynced(snapshot, snapshot.pendingMutations);
}

export function toLocalMeeting(input: CanonicalMeetingInput): LocalMeeting {
  return {
    id: input.id,
    groupId: input.groupId,
    ...(input.facilitatorId ? { facilitatorId: input.facilitatorId } : {}),
    ...(input.chaplainUserId ? { chaplainUserId: input.chaplainUserId } : {}),
    scheduledStartAt: input.scheduledStartAt,
    status: input.status,
    notes: input.notes,
    followUpCategory: input.followUpCategory,
    followUpNotes: input.followUpNotes,
    attendance: input.attendance,
    prayerRequests: input.prayerRequests,
    meetingPhotos: input.meetingPhotos,
    syncStatus: input.syncStatus ?? "pending",
    ...(input.scheduledEndAt ? { scheduledEndAt: input.scheduledEndAt } : {}),
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    ...(input.latitude !== null && input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== null && input.longitude !== undefined ? { longitude: input.longitude } : {}),
    ...(input.locationName ? { locationName: input.locationName } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(input.locationCapturedAt ? { locationCapturedAt: input.locationCapturedAt } : {}),
    ...(input.locationSource ? { locationSource: input.locationSource } : {}),
  };
}

export function createMembershipFromMember(member: LocalMember, now: string, id: string): OfflineMembership {
  return {
    id,
    groupId: member.groupId,
    userId: member.id,
    position: member.position ?? null,
    active: true,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function createUserFromMember(member: LocalMember, now: string): OfflineUser {
  return {
    id: member.id,
    displayName: member.displayName,
    email: member.email ?? null,
    phone: member.phone ?? "",
    role: member.role ?? "member",
    status: "active",
    token: "",
    updatedAt: now,
    ...(member.profilePhotoUri ? { profilePhotoUri: member.profilePhotoUri } : {}),
    ...(member.profilePhotoRemoteMediaId ? { profilePhotoRemoteMediaId: member.profilePhotoRemoteMediaId } : {}),
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const existingIndex = items.findIndex((candidate) => candidate.id === item.id);
  if (existingIndex === -1) return [...items, item];
  return items.map((candidate, index) => (index === existingIndex ? { ...candidate, ...item } : candidate));
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return items.reduce<T[]>((accumulator, item) => upsertById(accumulator, item), []);
}

function mutationKey(mutation: OfflineMutation) {
  switch (mutation.type) {
    case "user.upsert":
      return `${mutation.type}:${mutation.user.id}`;
    case "group.upsert":
      return `${mutation.type}:${mutation.group.id}`;
    case "membership.upsert":
      return `${mutation.type}:${mutation.membership.id}`;
    case "meeting.upsert":
      return `${mutation.type}:${mutation.meeting.id}`;
    case "media.upsert":
      return `${mutation.type}:${mutation.media.id}`;
  }
}
