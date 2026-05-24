import type { SupportedLocale } from "@diaconia/shared";

const adminLabels = {
  es: {
    // Sign in
    signInSubtitle: "Pegá tu token de Cognito, o continuá sin token en desarrollo local.",
    cognitoTokenLabel: "Token de Cognito",
    cognitoTokenPlaceholder: "Pegá el token (opcional en desarrollo local)",
    signingIn: "Ingresando…",
    signIn: "Ingresar",
    invalidToken: "Token inválido. Verificá tu token de Cognito e intentá de nuevo.",

    // Nav
    dashboard: "Inicio",
    meetings: "Reuniones",
    members: "Miembros",
    settings: "Configuración",
    toggleSidebar: "Abrir/cerrar menú",

    // App bar / user menu
    userMenu: "Menú de usuario",
    profile: "Perfil",
    signOut: "Cerrar sesión",

    // Profile editor
    editProfile: "Editar perfil",
    displayName: "Nombre completo",
    email: "Correo electrónico",
    phone: "Teléfono",
    avatarUrl: "URL de foto de perfil",
    cancel: "Cancelar",
    saveProfile: "Guardar perfil",

    // Dashboard
    greeting: (name: string) => `Hola, ${name}`,
    greetingFallback: "Bienvenido",
    plannedMeetings: "Reuniones planificadas",
    plannedMeetingsDesc: "Reuniones pendientes de informe",
    openPrayerRequests: "Pedidos de oración abiertos",
    openPrayerRequestsDesc: "Pedidos sin respuesta",
    meetingReports: "Informes de reunión",
    meetingReportsDesc: "Informes enviados por facilitadores",
    quickLinks: "Accesos rápidos",
    viewAllMeetings: "Ver todas las reuniones",
    viewMembers: "Ver miembros",

    // Meetings list
    meetingsSubtitle: "Todas las sesiones de grupos de confianza e informes de campo",
    exportCsv: "Exportar CSV",
    from: "Desde",
    to: "Hasta",
    groupId: "ID de grupo",
    filter: "Filtrar",
    loadingSessions: "Cargando sesiones…",
    loading: "Cargando…",
    colDate: "Fecha",
    colGroup: "Grupo",
    colFacilitator: "Facilitador",
    colFollowUp: "Seguimiento",
    colPhotos: "Fotos",
    colPrayer: "Oración",
    colNotes: "Notas",
    noRequests: "Sin pedidos",
    noNotes: "Sin notas",
    noSessions: "No hay sesiones para mostrar.",
    meetingPhoto: "Foto de reunión",

    // Members
    membersSubtitle: "Facilitadores y miembros de los grupos",
    facilitators: "Facilitadores",
    found: (n: number) => `${n} encontrado${n !== 1 ? "s" : ""}`,
    colName: "Nombre",
    colCommunity: "Comunidad",
    colSessions: "Sesiones",
    noFacilitators: "No se encontraron facilitadores.",
    groupAttendees: "Asistentes del grupo",
    attendeesComing: "Gestión de asistentes próximamente",
    attendeesComingDesc:
      "Las listas de asistentes por grupo estarán disponibles aquí cuando la API esté lista.",

    // Settings
    settingsSubtitle: "Preferencias y configuración de la aplicación",
    preferences: "Preferencias",
    language: "Idioma",
    languageDesc: "Elegí el idioma para fechas y etiquetas",
    apiEndpoint: "Servidor API",
    advanced: "Avanzado",
    moreSettingsSoon: "Más configuraciones próximamente",
    moreSettingsDesc:
      "La gestión de grupos, notificaciones y roles de usuario aparecerá aquí.",

    // Status
    sessions: (n: number) => `${n} sesión${n !== 1 ? "es" : ""}`,
  },

  en: {
    // Sign in
    signInSubtitle: "Paste a Cognito ID token, or continue without one in local dev.",
    cognitoTokenLabel: "Cognito ID Token",
    cognitoTokenPlaceholder: "Paste bearer token (optional for local dev)",
    signingIn: "Signing in…",
    signIn: "Sign in",
    invalidToken: "Invalid token. Check your Cognito ID token and try again.",

    // Nav
    dashboard: "Dashboard",
    meetings: "Meetings",
    members: "Members",
    settings: "Settings",
    toggleSidebar: "Toggle sidebar",

    // App bar / user menu
    userMenu: "User menu",
    profile: "Profile",
    signOut: "Sign out",

    // Profile editor
    editProfile: "Edit Profile",
    displayName: "Display Name",
    email: "Email",
    phone: "Phone",
    avatarUrl: "Avatar URL",
    cancel: "Cancel",
    saveProfile: "Save Profile",

    // Dashboard
    greeting: (name: string) => `Welcome back, ${name}`,
    greetingFallback: "Welcome back",
    plannedMeetings: "Planned Meetings",
    plannedMeetingsDesc: "Meetings awaiting submission",
    openPrayerRequests: "Open Prayer Requests",
    openPrayerRequestsDesc: "Prayer requests still open",
    meetingReports: "Meeting Reports",
    meetingReportsDesc: "Reports submitted by facilitators",
    quickLinks: "Quick Links",
    viewAllMeetings: "View all meetings",
    viewMembers: "View members",

    // Meetings list
    meetingsSubtitle: "All trust group sessions and field reports",
    exportCsv: "Export CSV",
    from: "From",
    to: "To",
    groupId: "Group ID",
    filter: "Filter",
    loadingSessions: "Loading sessions…",
    loading: "Loading…",
    colDate: "Date",
    colGroup: "Group",
    colFacilitator: "Facilitator",
    colFollowUp: "Follow-up",
    colPhotos: "Photos",
    colPrayer: "Prayer",
    colNotes: "Notes",
    noRequests: "No requests",
    noNotes: "No notes",
    noSessions: "No sessions to show.",
    meetingPhoto: "Meeting photo",

    // Members
    membersSubtitle: "Facilitators and group members",
    facilitators: "Facilitators",
    found: (n: number) => `${n} found`,
    colName: "Name",
    colCommunity: "Community",
    colSessions: "Sessions",
    noFacilitators: "No facilitators found.",
    groupAttendees: "Group Attendees",
    attendeesComing: "Attendee management coming soon",
    attendeesComingDesc:
      "Group-level attendee lists will be available here once the roster API is ready.",

    // Settings
    settingsSubtitle: "Application preferences and configuration",
    preferences: "Preferences",
    language: "Language",
    languageDesc: "Choose the display language for dates and labels",
    apiEndpoint: "API Endpoint",
    advanced: "Advanced",
    moreSettingsSoon: "More settings coming soon",
    moreSettingsDesc: "Group management, notifications, and user roles will appear here.",

    // Status
    sessions: (n: number) => `${n} session${n !== 1 ? "s" : ""}`,
  },
} as const satisfies Record<SupportedLocale, object>;

export type AdminLabels = (typeof adminLabels)["es"];
export function t(locale: SupportedLocale): AdminLabels {
  return adminLabels[locale] as AdminLabels;
}
