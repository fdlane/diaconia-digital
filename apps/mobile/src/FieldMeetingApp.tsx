import {
  formatDisplayDate,
  getProfileInitials,
  labels,
  type AttendanceStatus,
  type FollowUpCategory,
  type Role,
  type SupportedLocale,
} from "@diaconia/shared";
import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import diaconiaLogo from "../assets/logo.png";
import { getApiBaseUrl } from "./config/endpoints";
import { getEffectivePublicEnv } from "./config/publicEnv";
import { pickImage } from "./media";
import {
  bootstrapSnapshot,
  createMembershipFromMember,
  createUserFromMember,
  enqueueMutation,
  markMutationBatchSynced,
  selectLocalGroups,
  selectLocalMembers,
  toLocalMeeting,
  type MobileOfflineSnapshot,
  type OfflineGroup,
  type OfflineMutation,
} from "./offlineStore";
import { adminUserId, defaultGroupId, facilitatorUserId, seedGroups, seedMembers } from "./seed";
import { pendingMutationsReadyForSync, syncOfflineMutations } from "./sync/offlineMutations";
import { uploadPhotoAsset } from "./sync/zero";
import {
  loadLocale,
  loadMeetings,
  loadOfflineSnapshot,
  loadUser,
  removeUser,
  saveLocale,
  saveMeetings,
  saveMembers,
  saveOfflineSnapshot,
  saveUser,
} from "./storage";
import type { LocalGroup, LocalMeeting, LocalMember, LocalPrayerRequest, LocalUser } from "./types";
import { EmptyState, Avatar, Chip, MetricTile, NativeTitle, Page, PillButton, Row, Section, nativeTokens } from "./ui/nativeField";
import { uuidv7 } from "./uuid";

export type AuthenticatedSession = {
  user: LocalUser;
  getToken: () => Promise<string>;
  signOut: () => Promise<void>;
};

type AppTab = "today" | "capture" | "history";

const apiUrl = getApiBaseUrl(getEffectivePublicEnv(), Platform.OS);

function createBootstrapOfflineSnapshot(meetings: LocalMeeting[] = []): MobileOfflineSnapshot {
  const now = new Date().toISOString();
  const users = seedMembers.map((member) => createUserFromMember(member, now));
  const memberships = seedMembers.map((member, index) => createMembershipFromMember(member, now, `${member.groupId}-${member.id}-${index}`));
  const groups = seedGroups.map((group) => ({ ...group, active: true, createdAt: now, updatedAt: now }) satisfies OfflineGroup);
  return bootstrapSnapshot({ users, groups, memberships, meetings });
}

const copyByLocale = {
  es: {
    today: "Hoy",
    capture: "Captura",
    history: "Historial",
    homeTitle: "Trabajo de campo",
    homeSubtitle: "Captura reuniones, fotos y cambios aunque no haya conexión.",
    currentMeeting: "Reunión actual",
    currentMeetingSub: "Lista para guardar localmente primero",
    quickActions: "Acciones rápidas",
    recentReports: "Reportes recientes",
    syncCenter: "Estado de sincronización",
    allLocal: "Todo queda guardado en este dispositivo antes de sincronizar.",
    startMeeting: "Nueva reunión",
    addPhoto: "Foto",
    addPrayer: "Oración",
    chooseGroup: "Elegir grupo",
    groupPeople: "Personas del grupo",
    meetingForm: "Informe",
    offlineReady: "Offline listo",
    pending: "Pendiente",
    synced: "Sincronizado",
    failed: "Revisar",
    draft: "Borrador",
    savedLocal: "Guardado localmente",
    signedInAs: "Ingresaste como",
    profile: "Perfil",
    editProfile: "Editar perfil",
    signOut: "Salir",
    adminTools: "Administración",
    addGroup: "Agregar grupo",
    addPerson: "Agregar persona",
    newGroupName: "Nombre del grupo",
    newGroupCommunity: "Comunidad",
    newPersonName: "Nombre completo",
    newPersonPhone: "Teléfono",
    facilitator: "Facilitador",
    makeFacilitator: "Marcar facilitador",
    removeFacilitator: "Quitar facilitador",
    present: "Presente",
    absent: "Ausente",
    excused: "Justificado",
    prayerRequests: "Peticiones de oración",
    prayerPlaceholder: "Escribe una petición pública de oración",
    noPrayers: "Sin peticiones todavía.",
    followUp: "Seguimiento",
    photosHelp: "Las fotos se conservan en el borrador cuando guardas; luego se suben después de crear la reunión.",
    noPhotos: "Sin fotos todavía.",
    retrySync: "Reintentar sync",
    displayName: "Nombre",
    email: "Correo",
    phone: "Teléfono",
    accessToken: "Token de acceso",
    saveProfile: "Guardar perfil",
    cancel: "Cancelar",
    devSignIn: "Ingreso demo",
    fieldLogin: "Entrada de campo",
    fieldLoginBody: "Diseñado como una app nativa: listas simples, captura rápida y confianza offline desde el primer toque.",
  },
  en: {
    today: "Today",
    capture: "Capture",
    history: "History",
    homeTitle: "Field work",
    homeSubtitle: "Capture meetings, photos, and changes even without a connection.",
    currentMeeting: "Current meeting",
    currentMeetingSub: "Ready to save locally first",
    quickActions: "Quick actions",
    recentReports: "Recent reports",
    syncCenter: "Sync status",
    allLocal: "Everything is saved on this device before it syncs.",
    startMeeting: "New meeting",
    addPhoto: "Photo",
    addPrayer: "Prayer",
    chooseGroup: "Choose group",
    groupPeople: "Group people",
    meetingForm: "Report",
    offlineReady: "Offline ready",
    pending: "Pending",
    synced: "Synced",
    failed: "Review",
    draft: "Draft",
    savedLocal: "Saved locally",
    signedInAs: "Signed in as",
    profile: "Profile",
    editProfile: "Edit profile",
    signOut: "Sign out",
    adminTools: "Administration",
    addGroup: "Add group",
    addPerson: "Add person",
    newGroupName: "Group name",
    newGroupCommunity: "Community",
    newPersonName: "Full name",
    newPersonPhone: "Phone",
    facilitator: "Facilitator",
    makeFacilitator: "Make facilitator",
    removeFacilitator: "Remove facilitator",
    present: "Present",
    absent: "Absent",
    excused: "Excused",
    prayerRequests: "Prayer requests",
    prayerPlaceholder: "Write a public prayer request",
    noPrayers: "No requests yet.",
    followUp: "Follow-up",
    photosHelp: "Photos stay with the draft when you save; then they upload after the meeting row exists.",
    noPhotos: "No photos yet.",
    retrySync: "Retry sync",
    displayName: "Name",
    email: "Email",
    phone: "Phone",
    accessToken: "Access token",
    saveProfile: "Save profile",
    cancel: "Cancel",
    devSignIn: "Demo sign-in",
    fieldLogin: "Field entry",
    fieldLoginBody: "Designed like a native app: simple lists, fast capture, and offline confidence from the first tap.",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

function attendanceLabel(status: AttendanceStatus, locale: SupportedLocale) {
  return copyByLocale[locale][status];
}

function syncTone(syncStatus?: LocalMeeting["syncStatus"]): "neutral" | "success" | "warning" | "danger" {
  if (syncStatus === "synced") return "success";
  if (syncStatus === "pending") return "warning";
  if (syncStatus === "failed") return "danger";
  return "neutral";
}

function syncLabel(syncStatus: LocalMeeting["syncStatus"] | undefined, locale: SupportedLocale) {
  const text = copyByLocale[locale];
  if (syncStatus === "synced") return text.synced;
  if (syncStatus === "pending") return text.pending;
  if (syncStatus === "failed") return text.failed;
  return text.draft;
}

export function FieldMeetingApp({ authenticatedSession }: { authenticatedSession?: AuthenticatedSession }) {
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [user, setUser] = useState<LocalUser | null>(null);
  const [offlineSnapshot, setOfflineSnapshot] = useState<MobileOfflineSnapshot>(() => createBootstrapOfflineSnapshot());
  const [groups, setGroups] = useState<LocalGroup[]>(seedGroups);
  const [members, setMembers] = useState<LocalMember[]>(seedMembers);
  const [meetings, setMeetings] = useState<LocalMeeting[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);
  const [notes, setNotes] = useState("");
  const [followUpCategory, setFollowUpCategory] = useState<FollowUpCategory>("none");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [meetingPhotos, setMeetingPhotos] = useState<LocalMeeting["meetingPhotos"]>([]);
  const [prayerRequests, setPrayerRequests] = useState<LocalPrayerRequest[]>([]);
  const [newPrayer, setNewPrayer] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCommunity, setNewGroupCommunity] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const copy = labels[locale];
  const text = copyByLocale[locale];
  const [status, setStatus] = useState(copy.ready);
  const authLocked = Boolean(authenticatedSession);

  useEffect(() => {
    async function hydrate() {
      const storedLocale = await loadLocale();
      setLocale(storedLocale);
      setStatus(labels[storedLocale].ready);
      const storedMeetings = await loadMeetings();
      const storedSnapshot = await loadOfflineSnapshot(createBootstrapOfflineSnapshot(storedMeetings));
      setOfflineSnapshot(storedSnapshot);
      setGroups(selectLocalGroups(storedSnapshot));
      setMembers(selectLocalMembers(storedSnapshot));
      setMeetings(storedSnapshot.meetings.length ? storedSnapshot.meetings : storedMeetings);
      if (authenticatedSession) {
        setUser(authenticatedSession.user);
        setProfileName(authenticatedSession.user.displayName);
        setProfileEmail(authenticatedSession.user.email ?? "");
        setProfilePhone(authenticatedSession.user.phone ?? "");
        setAccessToken("");
        return;
      }
      const storedUser = await loadUser();
      setUser(storedUser);
      if (storedUser) {
        setProfileName(storedUser.displayName);
        setProfileEmail(storedUser.email ?? "");
        setProfilePhone(storedUser.phone ?? "");
        setAccessToken(storedUser.token === "local-dev-token" ? "" : storedUser.token);
      }
    }

    void hydrate();
  }, [authenticatedSession]);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? { id: defaultGroupId, name: "Grupo demo", community: "Paraguay" };
  const groupMembers = useMemo(() => members.filter((member) => member.groupId === selectedGroup.id), [members, selectedGroup.id]);
  const presentCount = groupMembers.filter((member) => (attendance[member.id] ?? "present") === "present").length;
  const syncPendingCount = pendingMutationsReadyForSync(offlineSnapshot.pendingMutations).length;
  const draftCount = meetings.filter((meeting) => meeting.syncStatus === "draft").length;
  const localQueueCount = syncPendingCount + draftCount;
  const failedCount = meetings.filter((meeting) => meeting.syncStatus === "failed").length;
  const canAdmin = user?.role === "admin";

  async function getApiToken() {
    if (authenticatedSession) return authenticatedSession.getToken();
    return user?.token ?? "";
  }

  async function persistOfflineSnapshot(nextSnapshot: MobileOfflineSnapshot) {
    setOfflineSnapshot(nextSnapshot);
    setGroups(selectLocalGroups(nextSnapshot));
    setMembers(selectLocalMembers(nextSnapshot));
    setMeetings(nextSnapshot.meetings);
    await saveOfflineSnapshot(nextSnapshot);
    await saveMembers(selectLocalMembers(nextSnapshot));
    await saveMeetings(nextSnapshot.meetings);
  }

  async function updateLocale(nextLocale: SupportedLocale) {
    setLocale(nextLocale);
    setStatus(labels[nextLocale].ready);
    await saveLocale(nextLocale);
  }

  async function signIn(role: Role, token = "local-dev-token") {
    const isAdmin = role === "admin";
    const nextUser: LocalUser = {
      id: isAdmin ? adminUserId : facilitatorUserId,
      displayName: isAdmin ? "Administradora Demo" : "Facilitadora Demo",
      email: isAdmin ? "admin@diaconia.local" : "facilitator@diaconia.local",
      phone: isAdmin ? "+595 21 000 100" : "+595 21 000 200",
      role,
      token: token.trim() || "local-dev-token",
      status: "active",
    };
    setUser(nextUser);
    setProfileName(nextUser.displayName);
    setProfileEmail(nextUser.email ?? "");
    setProfilePhone(nextUser.phone ?? "");
    setAccessToken(nextUser.token === "local-dev-token" ? "" : nextUser.token);
    await saveUser(nextUser);
  }

  async function saveProfile() {
    if (!user) return;
    const now = new Date().toISOString();
    const nextUser: LocalUser = { ...user, displayName: profileName.trim() || user.displayName, email: profileEmail.trim() || null, phone: profilePhone.trim() || null, token: authLocked ? user.token : accessToken.trim() || user.token };
    setUser(nextUser);
    await saveUser(nextUser);
    const offlineUser = offlineSnapshot.users.find((candidate) => candidate.id === nextUser.id);
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "user.upsert", user: { ...offlineUser, ...nextUser, updatedAt: now } });
    await persistOfflineSnapshot(nextSnapshot);
    setProfileEditorOpen(false);
    setProfileMenuOpen(false);
    setStatus(copy.meetingQueued);
  }

  async function signOut() {
    if (authenticatedSession) {
      await authenticatedSession.signOut();
      return;
    }
    setUser(null);
    setProfileMenuOpen(false);
    setProfileEditorOpen(false);
    setAccessToken("");
    await removeUser();
  }

  async function updateUserPhoto() {
    if (!user) return;
    const photo = await pickImage("user_profile_photo");
    if (!photo) return;
    const now = new Date().toISOString();
    const nextUser = { ...user, profilePhotoUri: photo.uri };
    setUser(nextUser);
    await saveUser(nextUser);
    const offlineUser = offlineSnapshot.users.find((candidate) => candidate.id === user.id);
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "user.upsert", user: { ...offlineUser, ...nextUser, pendingProfilePhoto: photo, updatedAt: now } });
    await persistOfflineSnapshot(nextSnapshot);
    setStatus(copy.profilePhotoPending);
  }

  async function updateMemberPhoto(memberId: string) {
    const photo = await pickImage("user_profile_photo");
    if (!photo) return;
    const now = new Date().toISOString();
    const currentMember = members.find((member) => member.id === memberId);
    if (!currentMember) return;
    const nextMember = { ...currentMember, profilePhotoUri: photo.uri };
    const offlineUser = offlineSnapshot.users.find((candidate) => candidate.id === memberId);
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "user.upsert", user: { ...offlineUser, ...createUserFromMember(nextMember, now), pendingProfilePhoto: photo, updatedAt: now } });
    await persistOfflineSnapshot(nextSnapshot);
    setStatus(copy.memberPhotoPending);
  }

  async function addMeetingPhoto() {
    const photo = await pickImage("meeting_photo");
    if (photo) setMeetingPhotos((value) => [...value, photo]);
  }

  async function addGroup() {
    if (!user || !newGroupName.trim()) return;
    const now = new Date().toISOString();
    const group: OfflineGroup = { id: await uuidv7(), name: newGroupName.trim(), community: newGroupCommunity.trim() || "Paraguay", facilitatorId: user.role === "facilitator" ? user.id : facilitatorUserId, chaplainUserId: null, active: true, createdAt: now, updatedAt: now };
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "group.upsert", group });
    await persistOfflineSnapshot(nextSnapshot);
    setSelectedGroupId(group.id);
    setNewGroupName("");
    setNewGroupCommunity("");
    setStatus(copy.meetingQueued);
  }

  async function addPerson() {
    if (!newPersonName.trim()) return;
    const phone = newPersonPhone.trim();
    const now = new Date().toISOString();
    const nextPerson: LocalMember = { id: await uuidv7(), groupId: selectedGroup.id, displayName: newPersonName.trim(), role: "member", ...(phone ? { phone } : {}) };
    const userMutation = createUserFromMember(nextPerson, now);
    const membershipMutation = createMembershipFromMember(nextPerson, now, await uuidv7());
    let nextSnapshot = enqueueMutation(offlineSnapshot, { type: "user.upsert", user: userMutation });
    nextSnapshot = enqueueMutation(nextSnapshot, { type: "membership.upsert", membership: membershipMutation });
    await persistOfflineSnapshot(nextSnapshot);
    setNewPersonName("");
    setNewPersonPhone("");
    setStatus(copy.meetingQueued);
  }

  async function toggleFacilitator(memberId: string) {
    const now = new Date().toISOString();
    const existing = offlineSnapshot.users.find((candidate) => candidate.id === memberId);
    const currentMember = members.find((member) => member.id === memberId);
    if (!existing && !currentMember) return;
    const nextRole: Role = (existing?.role ?? currentMember?.role) === "facilitator" ? "member" : "facilitator";
    const nextUser = existing ? { ...existing, role: nextRole, updatedAt: now } : createUserFromMember({ ...currentMember!, role: nextRole }, now);
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "user.upsert", user: nextUser });
    await persistOfflineSnapshot(nextSnapshot);
    setStatus(copy.meetingQueued);
  }

  async function addPrayerRequest() {
    if (!newPrayer.trim()) return;
    const id = await uuidv7();
    const request = newPrayer.trim();
    setPrayerRequests((value) => [...value, { id, request }]);
    setNewPrayer("");
  }

  async function saveDraft(syncNow: boolean) {
    if (!user) return;
    const meeting: LocalMeeting = toLocalMeeting({
      id: await uuidv7(),
      groupId: selectedGroup.id,
      facilitatorId: user.id,
      chaplainUserId: selectedGroup.chaplainUserId ?? null,
      scheduledStartAt: new Date().toISOString(),
      occurredAt: new Date().toISOString(),
      status: "completed",
      latitude: selectedGroup.id === defaultGroupId ? -25.4646 : -27.3306,
      longitude: selectedGroup.id === defaultGroupId ? -56.0139 : -55.8667,
      locationName: selectedGroup.name,
      address: selectedGroup.community,
      locationCapturedAt: new Date().toISOString(),
      locationSource: "manual",
      notes,
      followUpCategory,
      followUpNotes,
      attendance: Object.fromEntries(groupMembers.map((member) => [member.id, attendance[member.id] ?? "present"])),
      prayerRequests,
      meetingPhotos,
      syncStatus: syncNow ? "pending" : "draft",
    });
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "meeting.upsert", meeting });
    await persistOfflineSnapshot(nextSnapshot);
    setNotes("");
    setFollowUpCategory("none");
    setFollowUpNotes("");
    setPrayerRequests([]);
    setMeetingPhotos([]);
    setStatus(syncNow ? copy.meetingQueued : copy.draftSaved);
    setActiveTab("history");
    if (syncNow) await syncPending(nextSnapshot);
  }

  async function syncPending(snapshot: MobileOfflineSnapshot = offlineSnapshot) {
    if (!user) return;
    setStatus(copy.syncing);
    const mutationsToSync = pendingMutationsReadyForSync(snapshot.pendingMutations);

    try {
      const token = await getApiToken();
      await syncOfflineMutations({ apiUrl, token, mutations: mutationsToSync });
      const failedMeetingPhotoIds = new Set<string>();
      const failedProfilePhotoUserIds = new Set<string>();
      let meetingsWithUploadedPhotos = snapshot.meetings;
      let usersWithUploadedPhotos = snapshot.users;
      const followUpProfileMutations: OfflineMutation[] = [];

      for (const mutation of mutationsToSync) {
        if (mutation.type !== "meeting.upsert") continue;
        let uploadedMeetingPhotos = mutation.meeting.meetingPhotos;
        try {
          for (const photo of mutation.meeting.meetingPhotos) {
            const remoteMediaId = photo.remoteMediaId ?? (await uploadPhotoAsset({ apiUrl, token, photo, meetingId: mutation.meeting.id }));
            uploadedMeetingPhotos = uploadedMeetingPhotos.map((candidate) => candidate.id === photo.id ? { ...candidate, uploaded: true, remoteMediaId } : candidate);
          }
          meetingsWithUploadedPhotos = meetingsWithUploadedPhotos.map((meeting) => meeting.id === mutation.meeting.id ? { ...meeting, meetingPhotos: uploadedMeetingPhotos, syncStatus: "synced" as const } : meeting);
        } catch {
          failedMeetingPhotoIds.add(mutation.meeting.id);
          meetingsWithUploadedPhotos = meetingsWithUploadedPhotos.map((meeting) => meeting.id === mutation.meeting.id ? { ...meeting, meetingPhotos: uploadedMeetingPhotos, syncStatus: "failed" as const } : meeting);
        }
      }

      for (const mutation of mutationsToSync) {
        if (mutation.type !== "user.upsert" || !mutation.user.pendingProfilePhoto || mutation.user.profilePhotoRemoteMediaId) continue;
        try {
          const remoteMediaId = await uploadPhotoAsset({ apiUrl, token, photo: mutation.user.pendingProfilePhoto, ownerUserId: mutation.user.id });
          const uploadedUser = { ...mutation.user, profilePhotoRemoteMediaId: remoteMediaId, pendingProfilePhoto: { ...mutation.user.pendingProfilePhoto, uploaded: true, remoteMediaId } };
          usersWithUploadedPhotos = usersWithUploadedPhotos.map((candidate) => candidate.id === uploadedUser.id ? { ...candidate, ...uploadedUser } : candidate);
          followUpProfileMutations.push({ ...mutation, user: uploadedUser });
          if (user.id === uploadedUser.id) {
            const nextUser = { ...user, profilePhotoRemoteMediaId: remoteMediaId };
            setUser(nextUser);
            await saveUser(nextUser);
          }
        } catch {
          failedProfilePhotoUserIds.add(mutation.user.id);
        }
      }

      if (followUpProfileMutations.length) {
        try {
          await syncOfflineMutations({ apiUrl, token, mutations: followUpProfileMutations });
        } catch {
          for (const mutation of followUpProfileMutations) if (mutation.type === "user.upsert") failedProfilePhotoUserIds.add(mutation.user.id);
        }
      }

      const snapshotWithUploadedMedia: MobileOfflineSnapshot = {
        ...snapshot,
        users: usersWithUploadedPhotos,
        meetings: meetingsWithUploadedPhotos,
        pendingMutations: snapshot.pendingMutations.map((mutation) => {
          if (mutation.type === "meeting.upsert") {
            const updatedMeeting = meetingsWithUploadedPhotos.find((meeting) => meeting.id === mutation.meeting.id);
            return updatedMeeting ? { ...mutation, meeting: updatedMeeting } : mutation;
          }
          if (mutation.type === "user.upsert") {
            const updatedUser = usersWithUploadedPhotos.find((candidate) => candidate.id === mutation.user.id);
            return updatedUser ? { ...mutation, user: updatedUser } : mutation;
          }
          return mutation;
        }),
      };
      const acknowledgedMutations = mutationsToSync.filter((mutation) => {
        if (mutation.type === "meeting.upsert") return !failedMeetingPhotoIds.has(mutation.meeting.id);
        if (mutation.type === "user.upsert") return !failedProfilePhotoUserIds.has(mutation.user.id);
        return true;
      });
      const finalizedSnapshot = markMutationBatchSynced(snapshotWithUploadedMedia, acknowledgedMutations);
      setMeetings(finalizedSnapshot.meetings);
      await saveOfflineSnapshot(finalizedSnapshot);
      setOfflineSnapshot(finalizedSnapshot);
      await saveMeetings(finalizedSnapshot.meetings);
      setStatus(finalizedSnapshot.pendingMutations.length || finalizedSnapshot.meetings.some((meeting) => meeting.syncStatus === "failed") ? copy.syncError : copy.syncComplete);
    } catch {
      const failedSnapshot = { ...snapshot, meetings: snapshot.meetings.map((meeting) => meeting.syncStatus === "pending" ? { ...meeting, syncStatus: "failed" as const } : meeting) };
      setMeetings(failedSnapshot.meetings);
      await saveOfflineSnapshot(failedSnapshot);
      setOfflineSnapshot(failedSnapshot);
      await saveMeetings(failedSnapshot.meetings);
      setStatus(copy.syncError);
    }
  }

  const languageSwitch = (
    <View accessibilityRole="tablist" style={styles.segmented}>
      {(["es", "en"] as const).map((option) => (
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: locale === option }} key={option} onPress={() => updateLocale(option)} style={[styles.segment, locale === option && styles.segmentActive]}>
          <Text style={[styles.segmentText, locale === option && styles.segmentTextActive]}>{option.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Page style={styles.signInPage}>
          {languageSwitch}
          <View style={styles.loginBrandRow}>
            <Image source={diaconiaLogo} style={styles.loginLogo} resizeMode="contain" />
            <Chip label={text.offlineReady} tone="success" />
          </View>
          <NativeTitle title={text.fieldLogin} subtitle={text.fieldLoginBody} />
          <Section title={text.devSignIn} subtitle={copy.signInHelp}>
            <View style={styles.formBlock}>
              <NativeInput onChangeText={setAccessToken} placeholder={text.accessToken} value={accessToken} />
              <PillButton label={text.facilitator} onPress={() => signIn("facilitator", accessToken)} variant="primary" />
              <PillButton label={text.adminTools} onPress={() => signIn("admin", accessToken)} />
            </View>
          </Section>
        </Page>
      </SafeAreaView>
    );
  }

  const currentUser = user as LocalUser;

  const renderTab = () => {
    if (activeTab === "capture") return renderCapture();
    if (activeTab === "history") return renderHistory();
    return renderToday();
  };

  function renderToday() {
    return (
      <>
        <Section title={text.currentMeeting} subtitle={text.currentMeetingSub}>
          <Row
            title={selectedGroup.name}
            subtitle={`${selectedGroup.community} · ${presentCount}/${groupMembers.length} ${copy.attendance.toLowerCase()}`}
            leading={<Avatar label={selectedGroup.name.slice(0, 2).toUpperCase()} />}
            trailing={<Chip label={text.savedLocal} tone="success" />}
            onPress={() => setActiveTab("capture")}
          />
        </Section>
        <View style={styles.metricsRow}>
          <MetricTile value={`${presentCount}/${groupMembers.length}`} label={copy.attendance} />
          <MetricTile value={`${meetingPhotos.length}`} label={copy.photos} tone="success" />
          <MetricTile value={`${localQueueCount}`} label={copy.localQueue} tone={localQueueCount ? "warning" : "success"} />
        </View>
        <Section title={text.quickActions}>
          <View style={styles.quickGrid}>
            <QuickAction label={text.startMeeting} value="＋" onPress={() => setActiveTab("capture")} />
            <QuickAction label={text.addPhoto} value="▣" onPress={addMeetingPhoto} />
            <QuickAction label={text.addPrayer} value="✚" onPress={() => setActiveTab("capture")} />
          </View>
        </Section>
        <Section title={text.syncCenter} subtitle={text.allLocal} trailing={<PillButton label={text.retrySync} onPress={() => syncPending()} variant="ghost" />}>
          <Row title={status} subtitle={syncPendingCount ? `${syncPendingCount} ${copy.syncPending.toLowerCase()}` : text.allLocal} trailing={<Chip label={failedCount ? text.failed : syncPendingCount ? text.pending : text.synced} tone={failedCount ? "danger" : syncPendingCount ? "warning" : "success"} />} />
        </Section>
        <MeetingHistoryPreview meetings={meetings} locale={locale} />
      </>
    );
  }

  function renderCapture() {
    return (
      <>
        <Section title={text.chooseGroup}>
          {groups.map((group) => (
            <Row key={group.id} title={group.name} subtitle={group.community} onPress={() => setSelectedGroupId(group.id)} trailing={group.id === selectedGroup.id ? <Chip label="✓" tone="primary" /> : null} />
          ))}
        </Section>
        {canAdmin ? renderAdminTools() : null}
        <Section title={text.groupPeople} subtitle={`${presentCount}/${groupMembers.length} ${copy.attendance.toLowerCase()}`}>
          {groupMembers.map((member) => (
            <View key={member.id} style={styles.personBlock}>
              <Row
                title={member.displayName}
                subtitle={[member.phone, member.position].filter(Boolean).join(" · ")}
                leading={member.profilePhotoUri ? <Image source={{ uri: member.profilePhotoUri }} style={styles.rowImage} /> : <Avatar label={getProfileInitials(member.displayName)} />}
                trailing={member.role === "facilitator" ? <Chip label={text.facilitator} tone="primary" /> : null}
                onPress={canAdmin || member.id === currentUser.id ? () => updateMemberPhoto(member.id) : undefined}
              />
              <View style={styles.statusRow}>{(["present", "absent", "excused"] as const).map((value) => <PillChoice key={value} label={attendanceLabel(value, locale)} active={(attendance[member.id] ?? "present") === value} onPress={() => setAttendance((state) => ({ ...state, [member.id]: value }))} />)}</View>
              {canAdmin ? <PillButton label={member.role === "facilitator" ? text.removeFacilitator : text.makeFacilitator} onPress={() => toggleFacilitator(member.id)} variant="ghost" /> : null}
            </View>
          ))}
        </Section>
        <Section title={text.prayerRequests}>
          <NativeInput multiline onChangeText={setNewPrayer} placeholder={text.prayerPlaceholder} value={newPrayer} />
          <PillButton label={text.addPrayer} onPress={addPrayerRequest} />
          {prayerRequests.length ? prayerRequests.map((request) => <Row key={request.id} title={request.request} />) : <EmptyState title={text.noPrayers} body={text.allLocal} />}
        </Section>
        <Section title={text.meetingForm}>
          <NativeInput multiline onChangeText={setNotes} placeholder={copy.meetingNotesPlaceholder} value={notes} tall />
          <Text style={styles.fieldLabel}>{text.followUp}</Text>
          <View style={styles.choiceGrid}>{(["none", "financial", "training", "wellbeing", "documentation", "other"] as const).map((value) => <PillChoice key={value} label={value} active={followUpCategory === value} onPress={() => setFollowUpCategory(value)} />)}</View>
          <NativeInput onChangeText={setFollowUpNotes} placeholder={copy.followUpDetailPlaceholder} value={followUpNotes} />
        </Section>
        <Section title={copy.photos} subtitle={text.photosHelp} trailing={<PillButton label={copy.add} onPress={addMeetingPhoto} />}>
          {meetingPhotos.length ? <ScrollView horizontal contentContainerStyle={styles.photoStrip}>{meetingPhotos.map((photo) => <Image key={photo.id} source={{ uri: photo.uri }} style={styles.meetingPhoto} />)}</ScrollView> : <EmptyState title={text.noPhotos} body={text.photosHelp} />}
        </Section>
        <View style={styles.actionBar}>
          <PillButton label={copy.saveDraft} onPress={() => saveDraft(false)} grow />
          <PillButton label={copy.saveAndSync} onPress={() => saveDraft(true)} variant="primary" grow />
        </View>
      </>
    );
  }

  function renderAdminTools() {
    return (
      <Section title={text.adminTools}>
        <NativeInput onChangeText={setNewGroupName} placeholder={text.newGroupName} value={newGroupName} />
        <NativeInput onChangeText={setNewGroupCommunity} placeholder={text.newGroupCommunity} value={newGroupCommunity} />
        <PillButton label={text.addGroup} onPress={addGroup} />
        <View style={styles.separator} />
        <NativeInput onChangeText={setNewPersonName} placeholder={text.newPersonName} value={newPersonName} />
        <NativeInput onChangeText={setNewPersonPhone} placeholder={text.newPersonPhone} value={newPersonPhone} />
        <PillButton label={text.addPerson} onPress={addPerson} variant="primary" />
      </Section>
    );
  }

  function renderHistory() {
    return (
      <Section title={text.recentReports} trailing={<PillButton label={text.retrySync} onPress={() => syncPending()} variant="ghost" />}>
        {meetings.length ? meetings.map((meeting) => {
          const present = Object.values(meeting.attendance).filter((value) => value === "present").length;
          const total = Object.keys(meeting.attendance).length;
          return <Row key={meeting.id} title={formatDisplayDate(meeting.occurredAt ?? meeting.scheduledStartAt, locale)} subtitle={`${present}/${total} · ${meeting.locationName ?? selectedGroup.name}`} trailing={<Chip label={syncLabel(meeting.syncStatus, locale)} tone={syncTone(meeting.syncStatus)} />} />;
        }) : <EmptyState title={copy.noMeetings} body={text.allLocal} />}
      </Section>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Page>
        <View style={styles.appHeader}>
          <Image source={diaconiaLogo} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.headerRight}>{languageSwitch}<Pressable onPress={() => setProfileMenuOpen((value) => !value)}>{user.profilePhotoUri ? <Image source={{ uri: user.profilePhotoUri }} style={styles.headerAvatar} /> : <Avatar label={getProfileInitials(user.displayName, user.email)} size={42} />}</Pressable></View>
        </View>
        {profileMenuOpen ? (
          <Section>
            <Row title={user.displayName} subtitle={user.email ?? user.phone ?? user.role} trailing={<Chip label={user.role} tone="primary" />} />
            <Row title={text.editProfile} onPress={() => setProfileEditorOpen(true)} />
            <Row title={copy.profilePhoto} onPress={updateUserPhoto} />
            <Row title={text.signOut} onPress={signOut} danger />
          </Section>
        ) : null}
        <NativeTitle title={activeTab === "today" ? text.homeTitle : activeTab === "capture" ? text.meetingForm : text.history} subtitle={activeTab === "today" ? text.homeSubtitle : `${selectedGroup.name} · ${selectedGroup.community}`} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{renderTab()}</ScrollView>
        <View style={styles.tabs}>
          <TabButton active={activeTab === "today"} label={text.today} onPress={() => setActiveTab("today")} />
          <TabButton active={activeTab === "capture"} label={text.capture} onPress={() => setActiveTab("capture")} />
          <TabButton active={activeTab === "history"} label={text.history} onPress={() => setActiveTab("history")} badge={syncPendingCount || failedCount} />
        </View>
        <Modal animationType="fade" onRequestClose={() => setProfileEditorOpen(false)} transparent visible={profileEditorOpen}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{text.editProfile}</Text>
              <NativeInput onChangeText={setProfileName} placeholder={text.displayName} value={profileName} />
              <NativeInput autoCapitalize="none" keyboardType="email-address" onChangeText={setProfileEmail} placeholder={text.email} value={profileEmail} />
              <NativeInput keyboardType="phone-pad" onChangeText={setProfilePhone} placeholder={text.phone} value={profilePhone} />
              {authLocked ? null : <NativeInput autoCapitalize="none" multiline onChangeText={setAccessToken} placeholder={text.accessToken} value={accessToken} />}
              <View style={styles.actionBar}><PillButton label={text.cancel} onPress={() => setProfileEditorOpen(false)} grow /><PillButton label={text.saveProfile} onPress={saveProfile} variant="primary" grow /></View>
            </View>
          </View>
        </Modal>
      </Page>
    </SafeAreaView>
  );
}

function MeetingHistoryPreview({ meetings, locale }: { meetings: LocalMeeting[]; locale: SupportedLocale }) {
  const text = copyByLocale[locale];
  return (
    <Section title={text.recentReports}>
      {meetings.slice(0, 3).length ? meetings.slice(0, 3).map((meeting) => <Row key={meeting.id} title={formatDisplayDate(meeting.occurredAt ?? meeting.scheduledStartAt, locale)} subtitle={meeting.locationName ?? text.savedLocal} trailing={<Chip label={syncLabel(meeting.syncStatus, locale)} tone={syncTone(meeting.syncStatus)} />} />) : <EmptyState title={labels[locale].noMeetings} body={text.allLocal} />}
    </Section>
  );
}

function QuickAction({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <Text style={styles.quickIcon}>{value}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function PillChoice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pillChoice, active && styles.pillChoiceActive]}>
      <Text style={[styles.pillChoiceText, active && styles.pillChoiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TabButton({ label, active, onPress, badge = 0 }: { label: string; active: boolean; onPress: () => void; badge?: number }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {badge ? <Text style={styles.tabBadge}>{badge}</Text> : null}
    </Pressable>
  );
}

function NativeInput(props: React.ComponentProps<typeof TextInput> & { tall?: boolean }) {
  const { style, tall, ...rest } = props;
  return <TextInput placeholderTextColor={nativeTokens.color.tertiary} style={[styles.input, tall && styles.inputTall, style]} textAlignVertical={props.multiline ? "top" : "center"} {...rest} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: nativeTokens.color.bg },
  signInPage: { justifyContent: "center", gap: 14, padding: 16 },
  loginBrandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 14 },
  loginLogo: { width: 190, height: 58 },
  appHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  headerLogo: { width: 142, height: 42 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21 },
  content: { gap: 12, paddingBottom: 104 },
  segmented: { flexDirection: "row", overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: nativeTokens.color.line, borderRadius: 999, backgroundColor: nativeTokens.color.surface },
  segment: { paddingHorizontal: 11, paddingVertical: 7 },
  segmentActive: { backgroundColor: nativeTokens.color.primary },
  segmentText: { color: nativeTokens.color.secondary, fontSize: 12, fontWeight: "800" },
  segmentTextActive: { color: "white" },
  metricsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, marginTop: 10 },
  quickGrid: { flexDirection: "row", gap: 10, padding: 12 },
  quickAction: { flex: 1, alignItems: "center", gap: 8, borderRadius: nativeTokens.radius.card, paddingVertical: 18, backgroundColor: nativeTokens.color.primarySoft },
  quickIcon: { color: nativeTokens.color.primary, fontSize: 24, fontWeight: "900" },
  quickLabel: { color: nativeTokens.color.ink, fontSize: 12, fontWeight: "800", textAlign: "center" },
  formBlock: { gap: 10, padding: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: nativeTokens.color.line, borderRadius: Platform.OS === "ios" ? 12 : 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: nativeTokens.color.surface, color: nativeTokens.color.ink, fontSize: 15 },
  inputTall: { minHeight: 118 },
  fieldLabel: { color: nativeTokens.color.secondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", marginHorizontal: 14, marginTop: 4 },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingBottom: 4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  pillChoice: { borderWidth: 1, borderColor: nativeTokens.color.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: nativeTokens.color.surface },
  pillChoiceActive: { borderColor: nativeTokens.color.primary, backgroundColor: nativeTokens.color.primarySoft },
  pillChoiceText: { color: nativeTokens.color.secondary, fontSize: 12, fontWeight: "800" },
  pillChoiceTextActive: { color: nativeTokens.color.primary },
  personBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: nativeTokens.color.line, paddingBottom: 8 },
  rowImage: { width: 44, height: 44, borderRadius: Platform.OS === "ios" ? 14 : 22 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: nativeTokens.color.line, marginVertical: 2 },
  photoStrip: { gap: 10, padding: 12 },
  meetingPhoto: { width: 104, height: 104, borderRadius: 18, borderWidth: 1, borderColor: nativeTokens.color.line, backgroundColor: nativeTokens.color.primarySoft },
  actionBar: { flexDirection: "row", gap: 10, paddingHorizontal: 14, marginTop: 2 },
  tabs: { position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", gap: 8, borderWidth: 1, borderColor: nativeTokens.color.line, borderRadius: Platform.OS === "ios" ? 24 : 28, padding: 6, backgroundColor: nativeTokens.color.surface, ...Platform.select({ web: { boxShadow: "0 16px 44px rgba(16, 24, 40, 0.18)" }, ios: { shadowColor: "#101828", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 6 } }) },
  tabButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 999, flexDirection: "row", gap: 6 },
  tabButtonActive: { backgroundColor: nativeTokens.color.primarySoft },
  tabText: { color: nativeTokens.color.secondary, fontSize: 13, fontWeight: "800" },
  tabTextActive: { color: nativeTokens.color.primary },
  tabBadge: { overflow: "hidden", minWidth: 18, borderRadius: 9, paddingHorizontal: 5, paddingVertical: 1, color: "white", backgroundColor: nativeTokens.color.danger, fontSize: 11, fontWeight: "900", textAlign: "center" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "rgba(16, 24, 40, 0.45)" },
  modalCard: { width: "100%", maxWidth: 520, gap: 10, borderRadius: 24, padding: 18, backgroundColor: nativeTokens.color.surface },
  modalTitle: { color: nativeTokens.color.ink, fontSize: 22, fontWeight: "900" },
  pressed: { opacity: 0.68 },
});
