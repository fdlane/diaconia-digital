export type AdminMeeting = {
  id: string;
  heldAt: string;
  submittedAt: string | null;
  facilitatorId: string;
  chaplainId: string | null;
  latitude: number | null;
  longitude: number | null;
  groupName: string;
  community: string;
  facilitatorName: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
  status?: "scheduled" | "completed" | "cancelled";
  mediaCount?: number;
  prayerRequestCount?: number;
  openPrayerRequestCount?: number;
};
