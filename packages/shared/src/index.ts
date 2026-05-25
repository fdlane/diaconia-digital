import { z } from "zod";

export const supportedLocales = ["es", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const roleSchema = z.enum(["admin", "facilitator", "chaplain", "member"]);
export type Role = z.infer<typeof roleSchema>;

export const userStatusSchema = z.enum(["invited", "active", "disabled"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const invitationStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const groupPositionSchema = z.enum(["president", "secretary", "treasurer"]);
export type GroupPosition = z.infer<typeof groupPositionSchema>;

export const meetingStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
export type MeetingStatus = z.infer<typeof meetingStatusSchema>;

export const mediaAssetTypeSchema = z.enum(["user_profile_photo", "group_profile_photo", "meeting_photo"]);
export type MediaAssetType = z.infer<typeof mediaAssetTypeSchema>;

export const attendanceStatusSchema = z.enum(["present", "absent", "excused"]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const prayerRequestStatusSchema = z.enum(["open", "answered", "archived"]);
export type PrayerRequestStatus = z.infer<typeof prayerRequestStatusSchema>;

export const followUpCategorySchema = z.enum([
  "none",
  "financial",
  "training",
  "wellbeing",
  "documentation",
  "other",
]);
export type FollowUpCategory = z.infer<typeof followUpCategorySchema>;

export const locationSourceSchema = z.enum(["manual", "device", "imported"]);
export type LocationSource = z.infer<typeof locationSourceSchema>;

const nullableDateTime = z.string().datetime().nullable();

export const userSchema = z.object({
  id: z.string().uuid(),
  authProvider: z.string().min(1).default("clerk"),
  authSubject: z.string().min(1).nullable(),
  displayName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(4).nullable(),
  role: roleSchema,
  status: userStatusSchema,
  profilePhotoMediaId: z.string().uuid().nullable(),
  invitedAt: nullableDateTime,
  activatedAt: nullableDateTime,
});
export type User = z.infer<typeof userSchema>;

export const invitationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  status: invitationStatusSchema,
  expiresAt: z.string().datetime(),
  acceptedAt: nullableDateTime,
  invitedByUserId: z.string().uuid().nullable(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  community: z.string().min(1),
  facilitatorId: z.string().uuid(),
  chaplainUserId: z.string().uuid().nullable(),
  profilePhotoMediaId: z.string().uuid().nullable(),
  active: z.boolean(),
});
export type Group = z.infer<typeof groupSchema>;

export const groupMembershipSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  position: groupPositionSchema.nullable(),
  active: z.boolean(),
  joinedAt: z.string().datetime(),
  leftAt: nullableDateTime,
});
export type GroupMembership = z.infer<typeof groupMembershipSchema>;

export const meetingSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  facilitatorId: z.string().uuid(),
  chaplainUserId: z.string().uuid().nullable(),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: nullableDateTime,
  occurredAt: nullableDateTime,
  status: meetingStatusSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  locationName: z.string().nullable(),
  address: z.string().nullable(),
  locationCapturedAt: nullableDateTime,
  locationSource: locationSourceSchema.nullable(),
  notes: z.string().max(4000).default(""),
  followUpCategory: followUpCategorySchema.default("none"),
  followUpNotes: z.string().max(2000).default(""),
  submittedAt: nullableDateTime,
  completedAt: nullableDateTime,
  cancelledAt: nullableDateTime,
});
export type Meeting = z.infer<typeof meetingSchema>;

export const attendanceSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  userId: z.string().uuid(),
  status: attendanceStatusSchema,
  note: z.string(),
});
export type Attendance = z.infer<typeof attendanceSchema>;

export const prayerRequestSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  request: z.string().min(1).max(2000),
  status: prayerRequestStatusSchema,
});
export type PrayerRequest = z.infer<typeof prayerRequestSchema>;

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  type: mediaAssetTypeSchema,
  ownerUserId: z.string().uuid().nullable(),
  groupId: z.string().uuid().nullable(),
  meetingId: z.string().uuid().nullable(),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  checksumSha256: z.string().min(16).nullable(),
  createdAt: z.string().datetime(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const createMeetingInputSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime().nullable().optional(),
  occurredAt: z.string().datetime().nullable().optional(),
  status: meetingStatusSchema.default("completed"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  locationCapturedAt: z.string().datetime().nullable().optional(),
  locationSource: locationSourceSchema.nullable().optional(),
  notes: z.string().max(4000).default(""),
  followUpCategory: followUpCategorySchema.default("none"),
  followUpNotes: z.string().max(2000).default(""),
  attendance: z.array(
    z.object({
      userId: z.string().uuid(),
      status: attendanceStatusSchema,
      note: z.string().max(500).default(""),
    }),
  ),
  prayerRequests: z
    .array(
      z.object({
        id: z.string().uuid(),
        request: z.string().min(1).max(2000),
      }),
    )
    .default([]),
  meetingPhotoMediaIds: z.array(z.string().uuid()).default([]),
});
export type CreateMeetingInput = z.infer<typeof createMeetingInputSchema>;

export const createMediaUploadInputSchema = z
  .object({
    type: mediaAssetTypeSchema,
    contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
    byteSize: z.number().int().positive().max(10 * 1024 * 1024),
    ownerUserId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    meetingId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.type === "user_profile_photo" && (value.groupId || value.meetingId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "user_profile_photo must only be attached to a user",
      });
    }

    if (value.type === "group_profile_photo" && (value.ownerUserId || value.meetingId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "group_profile_photo must only be attached to a group",
      });
    }

    if (value.type === "meeting_photo" && (value.ownerUserId || value.groupId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "meeting_photo must only be attached to a meeting",
      });
    }
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
    adminName: "Diaconia Admin",
    adminSubtitle: "Reuniones de campo y asistencia",
    add: "Agregar",
    appName: "Diaconia Mobile",
    signIn: "Ingresar",
    signInHelp:
      "Ingreso para usuarios invitados. En desarrollo local se usa un usuario demo para validar el flujo de campo.",
    groups: "Grupos",
    group: "Grupo",
    members: "Miembros",
    meetings: "Reuniones",
    meeting: "Reunion",
    attendance: "Asistencia",
    notes: "Notas",
    meetingNotesPlaceholder: "Notas de la reunion",
    followUp: "Seguimiento",
    followUpDetailPlaceholder: "Detalle de seguimiento",
    photos: "Fotos",
    noMeetingPhotos: "Sin fotos de reunion.",
    saveDraft: "Guardar borrador",
    saveAndSync: "Guardar y sincronizar",
    localQueue: "Cola local",
    retry: "Reintentar",
    ready: "Listo",
    loadingMeetings: "Cargando reuniones",
    exportCsv: "Exportar CSV",
    filters: "Filtros",
    accessToken: "Token de acceso",
    tokenPlaceholder: "Bearer token para ambiente real",
    from: "Desde",
    to: "Hasta",
    filter: "Filtrar",
    date: "Fecha",
    facilitator: "Facilitador",
    noNotes: "Sin notas",
    noMeetings: "No hay reuniones para mostrar.",
    meetingPhotoAlt: "Foto de reunion",
    profilePhoto: "Foto",
    meetingQueued: "Reunion guardada para sincronizar",
    draftSaved: "Borrador guardado",
    syncing: "Sincronizando",
    syncError: "Hay errores",
    profilePhotoPending: "Foto de perfil pendiente",
    memberPhotoPending: "Foto de miembro pendiente",
    syncPending: "Pendiente de sincronizacion",
    syncComplete: "Sincronizado",
  },
  en: {
    adminName: "Diaconia Admin",
    adminSubtitle: "Field meetings and attendance",
    add: "Add",
    appName: "Diaconia Mobile",
    signIn: "Sign in",
    signInHelp:
      "Sign-in for invited users. Local development uses a demo user to validate the field workflow.",
    groups: "Groups",
    group: "Group",
    members: "Members",
    meetings: "Meetings",
    meeting: "Meeting",
    attendance: "Attendance",
    notes: "Notes",
    meetingNotesPlaceholder: "Meeting notes",
    followUp: "Follow-up",
    followUpDetailPlaceholder: "Follow-up detail",
    photos: "Photos",
    noMeetingPhotos: "No meeting photos.",
    saveDraft: "Save draft",
    saveAndSync: "Save and sync",
    localQueue: "Local queue",
    retry: "Retry",
    ready: "Ready",
    loadingMeetings: "Loading meetings",
    exportCsv: "Export CSV",
    filters: "Filters",
    accessToken: "Access token",
    tokenPlaceholder: "Bearer token for real environments",
    from: "From",
    to: "To",
    filter: "Filter",
    date: "Date",
    facilitator: "Facilitator",
    noNotes: "No notes",
    noMeetings: "No meetings to show.",
    meetingPhotoAlt: "Meeting photo",
    profilePhoto: "Photo",
    meetingQueued: "Meeting saved for sync",
    draftSaved: "Draft saved",
    syncing: "Syncing",
    syncError: "There are errors",
    profilePhotoPending: "Profile photo pending",
    memberPhotoPending: "Member photo pending",
    syncPending: "Pending sync",
    syncComplete: "Synced",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function getProfileInitials(displayName: string, email?: string | null) {
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return (email?.trim()[0] ?? "?").toLocaleUpperCase();
  }

  const parts = trimmedName.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? trimmedName;
  const last = parts[parts.length - 1] ?? first;
  const initials = parts.length > 1 ? `${first.charAt(0)}${last.charAt(0)}` : trimmedName.slice(0, 2);

  return initials.toLocaleUpperCase();
}

export function formatDisplayDate(value: string, locale: SupportedLocale = "es") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-PY" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
