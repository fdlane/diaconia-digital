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

export const prayerRequestSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  attendeeId: z.string().uuid().nullable(),
  requesterName: z.string().min(1),
  request: z.string().min(1).max(2000),
  status: prayerRequestStatusSchema,
});
export type PrayerRequest = z.infer<typeof prayerRequestSchema>;

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
  prayerRequests: z
    .array(
      z.object({
        id: z.string().uuid(),
        attendeeId: z.string().uuid().nullable().optional(),
        requesterName: z.string().min(1),
        request: z.string().min(1).max(2000),
      }),
    )
    .default([]),
  meetingPhotoMediaIds: z.array(z.string().uuid()).default([]),
});
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const createMediaUploadInputSchema = z
  .object({
    type: mediaAssetTypeSchema,
    contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
    byteSize: z.number().int().positive().max(10 * 1024 * 1024),
    ownerUserId: z.string().uuid().optional(),
    attendeeId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.type === "user_profile_photo" && value.attendeeId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendeeId"],
        message: "user_profile_photo cannot be attached to an attendee",
      });
    }

    if (value.type === "attendee_profile_photo" && value.ownerUserId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerUserId"],
        message: "attendee_profile_photo cannot be attached to a user",
      });
    }

    if (value.type === "meeting_photo" && (value.ownerUserId || value.attendeeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "meeting_photo cannot be attached as a profile photo",
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
    adminSubtitle: "Sesiones de campo y asistencia",
    add: "Agregar",
    appName: "Diaconia Mobile",
    signIn: "Ingresar",
    signInHelp:
      "Ingreso de facilitadores con Cognito. En desarrollo local se usa un usuario demo para validar el flujo de campo.",
    groups: "Grupos",
    group: "Grupo",
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
    loadingSessions: "Cargando sesiones",
    sessions: "sesiones",
    exportCsv: "Exportar CSV",
    filters: "Filtros",
    cognitoToken: "Token Cognito",
    tokenPlaceholder: "Bearer token para ambiente real",
    from: "Desde",
    to: "Hasta",
    filter: "Filtrar",
    date: "Fecha",
    facilitator: "Facilitador",
    noNotes: "Sin notas",
    noSessions: "No hay sesiones para mostrar.",
    meetingPhotoAlt: "Foto de reunion",
    profilePhoto: "Foto",
    sessionQueued: "Sesion guardada para sincronizar",
    draftSaved: "Borrador guardado",
    syncing: "Sincronizando",
    syncError: "Hay errores",
    profilePhotoPending: "Foto de perfil pendiente",
    attendeePhotoPending: "Foto de asistente pendiente",
    syncPending: "Pendiente de sincronizacion",
    syncComplete: "Sincronizado",
  },
  en: {
    adminName: "Diaconia Admin",
    adminSubtitle: "Field sessions and attendance",
    add: "Add",
    appName: "Diaconia Mobile",
    signIn: "Sign in",
    signInHelp:
      "Facilitator sign-in with Cognito. Local development uses a demo user to validate the field workflow.",
    groups: "Groups",
    group: "Group",
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
    loadingSessions: "Loading sessions",
    sessions: "sessions",
    exportCsv: "Export CSV",
    filters: "Filters",
    cognitoToken: "Cognito token",
    tokenPlaceholder: "Bearer token for real environments",
    from: "From",
    to: "To",
    filter: "Filter",
    date: "Date",
    facilitator: "Facilitator",
    noNotes: "No notes",
    noSessions: "No sessions to show.",
    meetingPhotoAlt: "Meeting photo",
    profilePhoto: "Photo",
    sessionQueued: "Session saved for sync",
    draftSaved: "Draft saved",
    syncing: "Syncing",
    syncError: "There are errors",
    profilePhotoPending: "Profile photo pending",
    attendeePhotoPending: "Attendee photo pending",
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
