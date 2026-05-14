import { z } from "zod";

export const supportedLocales = ["es", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const roleSchema = z.enum(["facilitator", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const mediaAssetTypeSchema = z.enum([
  "user_profile_photo",
  "attendee_profile_photo",
  "meeting_photo",
]);
export type MediaAssetType = z.infer<typeof mediaAssetTypeSchema>;

export const attendanceStatusSchema = z.enum(["present", "absent", "excused"]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const followUpCategorySchema = z.enum([
  "none",
  "financial",
  "training",
  "wellbeing",
  "documentation",
  "other",
]);
export type FollowUpCategory = z.infer<typeof followUpCategorySchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  cognitoSub: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().min(4).nullable(),
  role: roleSchema,
  profilePhotoMediaId: z.string().uuid().nullable(),
});
export type User = z.infer<typeof userSchema>;

export const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  community: z.string().min(1),
  facilitatorId: z.string().uuid(),
  active: z.boolean(),
});
export type Group = z.infer<typeof groupSchema>;

export const attendeeSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  displayName: z.string().min(1),
  phone: z.string().min(4).nullable(),
  profilePhotoMediaId: z.string().uuid().nullable(),
  active: z.boolean(),
});
export type Attendee = z.infer<typeof attendeeSchema>;

export const sessionSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  facilitatorId: z.string().uuid(),
  heldAt: z.string().datetime(),
  notes: z.string().max(4000).default(""),
  followUpCategory: followUpCategorySchema.default("none"),
  followUpNotes: z.string().max(2000).default(""),
  submittedAt: z.string().datetime().nullable(),
});
export type Session = z.infer<typeof sessionSchema>;

export const attendanceSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  attendeeId: z.string().uuid(),
  status: attendanceStatusSchema,
});
export type Attendance = z.infer<typeof attendanceSchema>;

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  type: mediaAssetTypeSchema,
  ownerUserId: z.string().uuid().nullable(),
  attendeeId: z.string().uuid().nullable(),
  sessionId: z.string().uuid().nullable(),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  checksumSha256: z.string().min(16).nullable(),
  createdAt: z.string().datetime(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const createSessionInputSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  heldAt: z.string().datetime(),
  notes: z.string().max(4000).default(""),
  followUpCategory: followUpCategorySchema.default("none"),
  followUpNotes: z.string().max(2000).default(""),
  attendance: z.array(
    z.object({
      attendeeId: z.string().uuid(),
      status: attendanceStatusSchema,
    }),
  ),
  meetingPhotoMediaIds: z.array(z.string().uuid()).default([]),
});
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const createMediaUploadInputSchema = z.object({
  type: mediaAssetTypeSchema,
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  ownerUserId: z.string().uuid().optional(),
  attendeeId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});
export type CreateMediaUploadInput = z.infer<typeof createMediaUploadInputSchema>;

export const createMediaUploadResponseSchema = z.object({
  mediaId: z.string().uuid(),
  objectKey: z.string(),
  uploadUrl: z.string().url(),
  headers: z.record(z.string()),
});
export type CreateMediaUploadResponse = z.infer<typeof createMediaUploadResponseSchema>;

export const labels = {
  es: {
    appName: "Diaconia Campo",
    signIn: "Ingresar",
    groups: "Grupos",
    attendance: "Asistencia",
    notes: "Notas",
    followUp: "Seguimiento",
    photos: "Fotos",
    syncPending: "Pendiente de sincronizacion",
    syncComplete: "Sincronizado",
  },
  en: {
    appName: "Diaconia Mobile",
    signIn: "Sign in",
    groups: "Groups",
    attendance: "Attendance",
    notes: "Notes",
    followUp: "Follow-up",
    photos: "Photos",
    syncPending: "Pending sync",
    syncComplete: "Synced",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function formatDisplayDate(value: string, locale: SupportedLocale = "es") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-PY" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
