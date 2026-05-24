import type { AttendanceStatus, FollowUpCategory, Role } from "@diaconia/shared";

export type LocalUser = {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  token: string;
  role: Role;
  profilePhotoUri?: string;
  profilePhotoRemoteMediaId?: string;
};

export type LocalGroup = {
  id: string;
  name: string;
  community: string;
  facilitatorId?: string;
};

export type LocalAttendee = {
  id: string;
  groupId: string;
  displayName: string;
  phone?: string;
  isFacilitator?: boolean;
  profilePhotoUri?: string;
  profilePhotoRemoteMediaId?: string;
};

export type LocalPrayerRequest = {
  id: string;
  attendeeId?: string | null;
  requesterName: string;
  request: string;
};

export type LocalPhoto = {
  id: string;
  uri: string;
  type: "user_profile_photo" | "attendee_profile_photo" | "meeting_photo";
  contentType: string;
  byteSize: number;
  uploaded: boolean;
  remoteMediaId?: string;
};

export type LocalSession = {
  id: string;
  groupId: string;
  heldAt: string;
  notes: string;
  followUpCategory: FollowUpCategory;
  followUpNotes: string;
  attendance: Record<string, AttendanceStatus>;
  prayerRequests: LocalPrayerRequest[];
  meetingPhotos: LocalPhoto[];
  syncStatus: "draft" | "pending" | "synced" | "failed";
};
