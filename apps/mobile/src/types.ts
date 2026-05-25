import type { AttendanceStatus, FollowUpCategory, LocationSource, MeetingStatus, Role } from "@diaconia/shared";

export type LocalUser = {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  token: string;
  role: Role;
  status?: "invited" | "active" | "disabled";
  profilePhotoUri?: string;
  profilePhotoRemoteMediaId?: string;
};

export type LocalGroup = {
  id: string;
  name: string;
  community: string;
  facilitatorId?: string;
  chaplainUserId?: string | null;
};

export type LocalMember = {
  id: string;
  groupId: string;
  displayName: string;
  email?: string | null;
  phone?: string;
  role?: Role;
  position?: "president" | "secretary" | "treasurer" | null;
  profilePhotoUri?: string;
  profilePhotoRemoteMediaId?: string;
};

export type LocalPrayerRequest = {
  id: string;
  request: string;
};

export type LocalPhoto = {
  id: string;
  uri: string;
  type: "user_profile_photo" | "group_profile_photo" | "meeting_photo";
  contentType: string;
  byteSize: number;
  uploaded: boolean;
  remoteMediaId?: string;
};

export type LocalMeeting = {
  id: string;
  groupId: string;
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
  syncStatus: "draft" | "pending" | "synced" | "failed";
};
