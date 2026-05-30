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
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  loadMeetings,
  loadLocale,
  loadOfflineSnapshot,
  loadUser,
  removeUser,
  saveMeetings,
  saveLocale,
  saveMembers,
  saveOfflineSnapshot,
  saveUser,
} from "./storage";
import type { LocalGroup, LocalMeeting, LocalMember, LocalPrayerRequest, LocalUser } from "./types";
import { uuidv7 } from "./uuid";

export type AuthenticatedSession = {
  user: LocalUser;
  getToken: () => Promise<string>;
  signOut: () => Promise<void>;
};

const apiUrl = getApiBaseUrl(getEffectivePublicEnv(), Platform.OS);

function createBootstrapOfflineSnapshot(meetings: LocalMeeting[] = []): MobileOfflineSnapshot {
  const now = new Date().toISOString();
  const users = seedMembers.map((member) => createUserFromMember(member, now));
  const memberships = seedMembers.map((member, index) => createMembershipFromMember(member, now, `${member.groupId}-${member.id}-${index}`));
  const groups = seedGroups.map((group) => ({ ...group, active: true, createdAt: now, updatedAt: now }) satisfies OfflineGroup);
  return bootstrapSnapshot({ users, groups, memberships, meetings });
}

const brand = {
  background: "#f4f6fb",
  surface: "#ffffff",
  surfaceAlt: "#eef2ff",
  ink: "#17202a",
  muted: "#65717d",
  line: "#dfe5ee",
  primary: "#2e3192",
  primaryStrong: "#202369",
  accent: "#00a78e",
  warning: "#f3a712",
  danger: "#d64545",
  dark: "#121c22",
};

const ui = {
  es: {
    heroTitle: "Reunión del grupo de confianza",
    heroSubtitle: "Asistencia, fotos, peticiones de oración y notas — listo aun sin conexión.",
    adminMode: "Administración",
    facilitatorMode: "Facilitador",
    present: "Presente",
    absent: "Ausente",
    excused: "Justificado",
    meetingReport: "Informe de reunión",
    prayerRequests: "Peticiones de oración",
    prayerPlaceholder: "Escribe una petición pública de oración",
    addPrayer: "Agregar petición",
    addPerson: "Agregar persona",
    addGroup: "Agregar grupo",
    newGroupName: "Nombre del grupo",
    newGroupCommunity: "Comunidad",
    newPersonName: "Nombre completo",
    newPersonPhone: "Teléfono",
    makeFacilitator: "Facilitador",
    removeFacilitator: "Quitar facilitador",
    roleHelp: "Los administradores pueden agregar personas y marcar facilitadores.",
    facilitatorBadge: "Facilitador",
    metricsAttendance: "Asistencia",
    metricsPrayers: "Oración",
    metricsPhotos: "Fotos",
    reportHistory: "Reportes locales",
    noPrayers: "Sin peticiones todavía.",
    signedInAs: "Ingresaste como",
    myProfile: "Mi perfil",
    editProfile: "Editar perfil",
    displayName: "Nombre",
    email: "Correo",
    phone: "Teléfono",
    accessToken: "Token de acceso",
    accessTokenHelp: "Pega un token de acceso cuando esté configurado; demo local sigue disponible.",
    saveProfile: "Guardar perfil",
    signOut: "Salir",
    cancel: "Cancelar",
  },
  en: {
    heroTitle: "Trust group meeting",
    heroSubtitle: "Attendance, photos, prayer requests, and notes — ready even offline.",
    adminMode: "Administration",
    facilitatorMode: "Facilitator",
    present: "Present",
    absent: "Absent",
    excused: "Excused",
    meetingReport: "Meeting report",
    prayerRequests: "Prayer requests",
    prayerPlaceholder: "Write a public prayer request",
    addPrayer: "Add request",
    addPerson: "Add person",
    addGroup: "Add group",
    newGroupName: "Group name",
    newGroupCommunity: "Community",
    newPersonName: "Full name",
    newPersonPhone: "Phone",
    makeFacilitator: "Facilitator",
    removeFacilitator: "Remove facilitator",
    roleHelp: "Administrators can add people and mark facilitators.",
    facilitatorBadge: "Facilitator",
    metricsAttendance: "Attendance",
    metricsPrayers: "Prayer",
    metricsPhotos: "Photos",
    reportHistory: "Local reports",
    noPrayers: "No requests yet.",
    signedInAs: "Signed in as",
    myProfile: "My profile",
    editProfile: "Edit profile",
    displayName: "Name",
    email: "Email",
    phone: "Phone",
    accessToken: "Access token",
    accessTokenHelp: "Paste an access token once it is configured; local demo stays available.",
    saveProfile: "Save profile",
    signOut: "Sign out",
    cancel: "Cancel",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

function statusLabel(status: AttendanceStatus, locale: SupportedLocale) {
  return ui[locale][status];
}

export function FieldMeetingApp({ authenticatedSession }: { authenticatedSession?: AuthenticatedSession }) {
  const [locale, setLocale] = useState<SupportedLocale>("es");
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
  const text = ui[locale];
  const [status, setStatus] = useState(copy.ready);
  const authLocked = Boolean(authenticatedSession);

  useEffect(() => {
    async function hydrate() {
      const storedLocale = await loadLocale();
      setLocale(storedLocale);
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
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? {
      id: defaultGroupId,
      name: "Grupo demo",
      community: "Paraguay",
    };
  const groupMembers = useMemo(
    () => members.filter((member) => member.groupId === selectedGroup.id),
    [members, selectedGroup.id],
  );
  const presentCount = groupMembers.filter((member) => (attendance[member.id] ?? "present") === "present").length;
  const canAdmin = user?.role === "admin";

  async function getApiToken() {
    if (authenticatedSession) {
      return authenticatedSession.getToken();
    }
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
    const nextUser: LocalUser = {
      ...user,
      displayName: profileName.trim() || user.displayName,
      email: profileEmail.trim() || null,
      phone: profilePhone.trim() || null,
      token: authLocked ? user.token : accessToken.trim() || user.token,
    };
    setUser(nextUser);
    await saveUser(nextUser);
    const offlineUser = offlineSnapshot.users.find((candidate) => candidate.id === nextUser.id);
    const nextSnapshot = enqueueMutation(offlineSnapshot, {
      type: "user.upsert",
      user: { ...offlineUser, ...nextUser, updatedAt: now },
    });
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
    const nextSnapshot = enqueueMutation(offlineSnapshot, {
      type: "user.upsert",
      user: { ...offlineUser, ...nextUser, pendingProfilePhoto: photo, updatedAt: now },
    });
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
    const nextSnapshot = enqueueMutation(offlineSnapshot, {
      type: "user.upsert",
      user: {
        ...offlineUser,
        ...createUserFromMember(nextMember, now),
        pendingProfilePhoto: photo,
        updatedAt: now,
      },
    });
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
    const group: OfflineGroup = {
      id: await uuidv7(),
      name: newGroupName.trim(),
      community: newGroupCommunity.trim() || "Paraguay",
      facilitatorId: user.role === "facilitator" ? user.id : facilitatorUserId,
      chaplainUserId: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
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
    const nextPerson: LocalMember = {
      id: await uuidv7(),
      groupId: selectedGroup.id,
      displayName: newPersonName.trim(),
      role: "member",
      ...(phone ? { phone } : {}),
    };
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
    const nextUser = existing
      ? { ...existing, role: nextRole, updatedAt: now }
      : createUserFromMember({ ...currentMember!, role: nextRole }, now);
    const nextSnapshot = enqueueMutation(offlineSnapshot, { type: "user.upsert", user: nextUser });
    await persistOfflineSnapshot(nextSnapshot);
    setStatus(copy.meetingQueued);
  }

  async function addPrayerRequest() {
    if (!newPrayer.trim()) return;
    const id = await uuidv7();
    setPrayerRequests((value) => [
      ...value,
      {
        id,
        request: newPrayer.trim(),
      },
    ]);
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
            uploadedMeetingPhotos = uploadedMeetingPhotos.map((candidate) =>
              candidate.id === photo.id ? { ...candidate, uploaded: true, remoteMediaId } : candidate,
            );
          }
          meetingsWithUploadedPhotos = meetingsWithUploadedPhotos.map((meeting) =>
            meeting.id === mutation.meeting.id
              ? { ...meeting, meetingPhotos: uploadedMeetingPhotos, syncStatus: "synced" as const }
              : meeting,
          );
        } catch {
          failedMeetingPhotoIds.add(mutation.meeting.id);
          meetingsWithUploadedPhotos = meetingsWithUploadedPhotos.map((meeting) =>
            meeting.id === mutation.meeting.id
              ? { ...meeting, meetingPhotos: uploadedMeetingPhotos, syncStatus: "failed" as const }
              : meeting,
          );
        }
      }

      for (const mutation of mutationsToSync) {
        if (mutation.type !== "user.upsert" || !mutation.user.pendingProfilePhoto || mutation.user.profilePhotoRemoteMediaId) continue;
        try {
          const remoteMediaId = await uploadPhotoAsset({ apiUrl, token, photo: mutation.user.pendingProfilePhoto, ownerUserId: mutation.user.id });
          const uploadedUser = {
            ...mutation.user,
            profilePhotoRemoteMediaId: remoteMediaId,
            pendingProfilePhoto: { ...mutation.user.pendingProfilePhoto, uploaded: true, remoteMediaId },
          };
          usersWithUploadedPhotos = usersWithUploadedPhotos.map((candidate) =>
            candidate.id === uploadedUser.id ? { ...candidate, ...uploadedUser } : candidate,
          );
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
          for (const mutation of followUpProfileMutations) {
            if (mutation.type === "user.upsert") failedProfilePhotoUserIds.add(mutation.user.id);
          }
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
      setStatus(
        finalizedSnapshot.pendingMutations.length || finalizedSnapshot.meetings.some((meeting) => meeting.syncStatus === "failed")
          ? copy.syncError
          : copy.syncComplete,
      );
    } catch {
      const failedSnapshot = {
        ...snapshot,
        meetings: snapshot.meetings.map((meeting) =>
          meeting.syncStatus === "pending" ? { ...meeting, syncStatus: "failed" as const } : meeting,
        ),
      };
      setMeetings(failedSnapshot.meetings);
      await saveOfflineSnapshot(failedSnapshot);
      setOfflineSnapshot(failedSnapshot);
      await saveMeetings(failedSnapshot.meetings);
      setStatus(copy.syncError);
    }
  }

  const languageSwitch = (
    <View style={styles.segmented} accessibilityRole="tablist">
      {(["es", "en"] as const).map((option) => (
        <Pressable key={option} onPress={() => updateLocale(option)} style={[styles.segment, locale === option && styles.segmentActive]}>
          <Text style={[styles.segmentText, locale === option && styles.segmentTextActive]}>{option.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.signInCard}>
          {languageSwitch}
          <Image source={diaconiaLogo} style={styles.signInLogo} resizeMode="contain" />
          <Text style={styles.heroTitle}>{text.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{text.heroSubtitle}</Text>
          <View style={styles.signInButtons}>
            <TextInput
              onChangeText={setAccessToken}
              placeholder={text.accessToken}
              style={styles.input}
              value={accessToken}
            />
            <Text style={styles.microcopy}>{text.accessTokenHelp}</Text>
            <Pressable onPress={() => signIn("facilitator", accessToken)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{text.facilitatorMode}</Text>
            </Pressable>
            <Pressable onPress={() => signIn("admin", accessToken)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{text.adminMode}</Text>
            </Pressable>
          </View>
          <Text style={styles.microcopy}>{copy.signInHelp}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.headerRow}>
            <Image source={diaconiaLogo} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerActions}>
              {languageSwitch}
              <Pressable onPress={() => setProfileMenuOpen((value) => !value)} style={styles.headerAvatarButton}>
                {user.profilePhotoUri ? (
                  <Image source={{ uri: user.profilePhotoUri }} style={styles.headerAvatar} />
                ) : (
                  <Text style={styles.headerAvatarText}>{getProfileInitials(user.displayName, user.email)}</Text>
                )}
              </Pressable>
            </View>
          </View>
          {profileMenuOpen ? (
            <View style={styles.profileMenu}>
              <Text style={styles.menuTitle}>{text.myProfile}</Text>
              <Text style={styles.menuName}>{user.displayName}</Text>
              <Text style={styles.menuMeta}>{user.email ?? user.phone ?? user.role}</Text>
              <Pressable onPress={() => setProfileEditorOpen(true)} style={styles.menuItem}>
                <Text style={styles.menuItemText}>{text.editProfile}</Text>
              </Pressable>
              <Pressable onPress={updateUserPhoto} style={styles.menuItem}>
                <Text style={styles.menuItemText}>{copy.profilePhoto}</Text>
              </Pressable>
              <Pressable onPress={signOut} style={styles.menuItemDanger}>
                <Text style={styles.menuItemDangerText}>{text.signOut}</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.overline}>{selectedGroup.community}</Text>
          <Text style={styles.heroTitleLight}>{text.heroTitle}</Text>
          <Text style={styles.heroSubtitleLight}>{text.heroSubtitle}</Text>
          <View style={styles.userRow}>
            <Pressable onPress={updateUserPhoto} style={styles.avatarButton}>
              {user.profilePhotoUri ? <Image source={{ uri: user.profilePhotoUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>{getProfileInitials(user.displayName, user.email)}</Text>}
            </Pressable>
            <View style={styles.userCopy}>
              <Text style={styles.microcopyLight}>{text.signedInAs}</Text>
              <Text style={styles.rowTitleLight}>{user.displayName}</Text>
            </View>
            <Text style={styles.rolePill}>{user.role}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRail}>
          {groups.map((group) => (
            <Pressable key={group.id} onPress={() => setSelectedGroupId(group.id)} style={[styles.groupCard, group.id === selectedGroup.id && styles.groupCardActive]}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.body}>{group.community}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.metricRow}>
          <Metric label={text.metricsAttendance} value={`${presentCount}/${groupMembers.length}`} />
          <Metric label={text.metricsPrayers} value={`${prayerRequests.length}`} />
          <Metric label={text.metricsPhotos} value={`${meetingPhotos.length}`} />
        </View>

        {canAdmin ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{text.adminMode}</Text>
                <Text style={styles.body}>{text.roleHelp}</Text>
              </View>
            </View>
            <View style={styles.formRow}>
              <TextInput onChangeText={setNewGroupName} placeholder={text.newGroupName} style={styles.input} value={newGroupName} />
              <TextInput onChangeText={setNewGroupCommunity} placeholder={text.newGroupCommunity} style={styles.input} value={newGroupCommunity} />
            </View>
            <Pressable onPress={addGroup} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{text.addGroup}</Text></Pressable>
            <View style={styles.formRow}>
              <TextInput onChangeText={setNewPersonName} placeholder={text.newPersonName} style={styles.input} value={newPersonName} />
              <TextInput onChangeText={setNewPersonPhone} placeholder={text.newPersonPhone} style={styles.input} value={newPersonPhone} />
            </View>
            <Pressable onPress={addPerson} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{text.addPerson}</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.attendance}</Text>
          {groupMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <Pressable onPress={canAdmin || member.id === user.id ? () => updateMemberPhoto(member.id) : undefined} style={styles.smallAvatar}>
                {member.profilePhotoUri ? <Image source={{ uri: member.profilePhotoUri }} style={styles.smallAvatarImage} /> : <Text style={styles.smallAvatarText}>+</Text>}
              </Pressable>
              <View style={styles.memberInfo}>
                <View style={styles.nameLine}>
                  <Text style={styles.rowTitle}>{member.displayName}</Text>
                  {member.role === "facilitator" ? <Text style={styles.facilitatorPill}>{text.facilitatorBadge}</Text> : null}
                  {member.position ? <Text style={styles.facilitatorPill}>{member.position}</Text> : null}
                </View>
                <Text style={styles.body}>{member.phone}</Text>
                <View style={styles.statusRow}>
                  {(["present", "absent", "excused"] as const).map((value) => (
                    <Pressable key={value} onPress={() => setAttendance((state) => ({ ...state, [member.id]: value }))} style={[styles.statusPill, (attendance[member.id] ?? "present") === value && styles.statusPillActive]}>
                      <Text style={[styles.statusPillText, (attendance[member.id] ?? "present") === value && styles.statusPillTextActive]}>{statusLabel(value, locale)}</Text>
                    </Pressable>
                  ))}
                </View>
                {canAdmin ? (
                  <Pressable onPress={() => toggleFacilitator(member.id)} style={styles.linkButton}>
                    <Text style={styles.linkText}>{member.role === "facilitator" ? text.removeFacilitator : text.makeFacilitator}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.prayerRequests}</Text>
          <TextInput multiline onChangeText={setNewPrayer} placeholder={text.prayerPlaceholder} style={styles.textAreaSmall} value={newPrayer} />
          <Pressable onPress={addPrayerRequest} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{text.addPrayer}</Text></Pressable>
          {prayerRequests.length ? prayerRequests.map((request) => (
            <View key={request.id} style={styles.prayerCard}><Text style={styles.body}>{request.request}</Text></View>
          )) : <Text style={styles.body}>{text.noPrayers}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.meetingReport}</Text>
          <TextInput multiline onChangeText={setNotes} placeholder={copy.meetingNotesPlaceholder} style={styles.textArea} value={notes} />
          <Text style={styles.label}>{copy.followUp}</Text>
          <View style={styles.followUpGrid}>
            {(["none", "financial", "training", "wellbeing", "documentation", "other"] as const).map((value) => (
              <Pressable key={value} onPress={() => setFollowUpCategory(value)} style={[styles.choice, followUpCategory === value && styles.choiceActive]}>
                <Text style={[styles.choiceText, followUpCategory === value && styles.choiceTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput onChangeText={setFollowUpNotes} placeholder={copy.followUpDetailPlaceholder} style={styles.input} value={followUpNotes} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.photos}</Text>
            <Pressable onPress={addMeetingPhoto} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{copy.add}</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
            {meetingPhotos.map((photo) => <Image key={photo.id} source={{ uri: photo.uri }} style={styles.meetingPhoto} />)}
            {!meetingPhotos.length ? <Text style={styles.body}>{copy.noMeetingPhotos}</Text> : null}
          </ScrollView>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => saveDraft(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{copy.saveDraft}</Text></Pressable>
          <Pressable onPress={() => saveDraft(true)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{copy.saveAndSync}</Text></Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{text.reportHistory}</Text>
            <Pressable onPress={() => syncPending()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{copy.retry}</Text></Pressable>
          </View>
          <Text style={styles.body}>{status}</Text>
          {meetings.slice(0, 5).map((meeting) => (
            <View key={meeting.id} style={styles.queueRow}>
              <Text style={styles.rowTitle}>{formatDisplayDate(meeting.occurredAt ?? meeting.scheduledStartAt, locale)}</Text>
              <Text style={styles.body}>{meeting.syncStatus} · {Object.values(meeting.attendance).filter((value) => value === "present").length} / {Object.keys(meeting.attendance).length}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Modal animationType="fade" onRequestClose={() => setProfileEditorOpen(false)} transparent visible={profileEditorOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>{text.editProfile}</Text>
            <TextInput onChangeText={setProfileName} placeholder={text.displayName} style={styles.input} value={profileName} />
            <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setProfileEmail} placeholder={text.email} style={styles.input} value={profileEmail} />
            <TextInput keyboardType="phone-pad" onChangeText={setProfilePhone} placeholder={text.phone} style={styles.input} value={profilePhone} />
            {authLocked ? null : (
              <TextInput autoCapitalize="none" multiline onChangeText={setAccessToken} placeholder={text.accessToken} style={styles.textAreaSmall} value={accessToken} />
            )}
            <View style={styles.actions}>
              <Pressable onPress={() => setProfileEditorOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{text.cancel}</Text></Pressable>
              <Pressable onPress={saveProfile} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{text.saveProfile}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metricCard}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, alignItems: "center", backgroundColor: brand.background },
  content: { width: "100%", maxWidth: 560, gap: 14, padding: 14, paddingBottom: 32 },
  signInCard: { flex: 1, justifyContent: "center", width: "100%", maxWidth: 560, gap: 16, padding: 24, backgroundColor: brand.background },
  signInLogo: { width: 260, height: 82, alignSelf: "flex-start" },
  heroCard: { gap: 12, borderRadius: 28, padding: 20, backgroundColor: brand.dark, ...Platform.select({ web: { boxShadow: "0 24px 60px rgba(18,28,34,.22)" } }) },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 160, height: 48, backgroundColor: brand.surface, borderRadius: 14 },
  heroTitle: { color: brand.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  heroTitleLight: { color: "white", fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  heroSubtitle: { color: brand.muted, fontSize: 16, lineHeight: 23 },
  heroSubtitleLight: { color: "#d8ddff", fontSize: 16, lineHeight: 23 },
  overline: { color: "#aeb8ff", fontSize: 12, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.13)", paddingTop: 14 },
  userCopy: { flex: 1 },
  avatarButton: { width: 54, height: 54, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 18, backgroundColor: brand.surfaceAlt },
  headerAvatarButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 999, backgroundColor: brand.surface },
  headerAvatar: { width: 42, height: 42 },
  headerAvatarText: { color: brand.primaryStrong, fontSize: 13, fontWeight: "900" },
  profileMenu: { alignSelf: "flex-end", width: 230, gap: 8, borderRadius: 18, padding: 14, backgroundColor: brand.surface, ...Platform.select({ web: { boxShadow: "0 16px 42px rgba(18,28,34,.20)" } }) },
  menuTitle: { color: brand.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  menuName: { color: brand.ink, fontSize: 16, fontWeight: "900" },
  menuMeta: { color: brand.muted, fontSize: 12 },
  menuItem: { borderTopWidth: 1, borderTopColor: brand.line, paddingTop: 10 },
  menuItemText: { color: brand.primary, fontWeight: "900" },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: brand.line, paddingTop: 10 },
  menuItemDangerText: { color: brand.danger, fontWeight: "900" },
  avatar: { width: 54, height: 54 },
  avatarText: { color: brand.primaryStrong, fontSize: 11, fontWeight: "900" },
  rolePill: { overflow: "hidden", borderRadius: 999, backgroundColor: brand.accent, color: "white", fontSize: 12, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 6, textTransform: "uppercase" },
  segmented: { flexDirection: "row", overflow: "hidden", alignSelf: "flex-start", borderWidth: 1, borderColor: brand.line, borderRadius: 999, backgroundColor: brand.surface },
  segment: { paddingHorizontal: 12, paddingVertical: 7 },
  segmentActive: { backgroundColor: brand.primary },
  segmentText: { color: brand.primaryStrong, fontWeight: "900", fontSize: 12 },
  segmentTextActive: { color: "white" },
  signInButtons: { gap: 10 },
  groupRail: { gap: 10, paddingHorizontal: 2 },
  groupCard: { width: 220, gap: 4, borderWidth: 1, borderColor: brand.line, borderRadius: 20, padding: 16, backgroundColor: brand.surface },
  groupCardActive: { borderColor: brand.primary, backgroundColor: brand.surfaceAlt },
  groupName: { color: brand.ink, fontSize: 16, fontWeight: "900" },
  metricRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, borderRadius: 18, padding: 14, backgroundColor: brand.surface },
  metricValue: { color: brand.primaryStrong, fontSize: 24, fontWeight: "900" },
  metricLabel: { color: brand.muted, fontSize: 12, fontWeight: "800" },
  section: { gap: 12, borderWidth: 1, borderColor: brand.line, borderRadius: 24, padding: 16, backgroundColor: brand.surface },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { color: brand.ink, fontSize: 20, fontWeight: "900" },
  body: { color: brand.muted, fontSize: 14, lineHeight: 20 },
  microcopy: { color: brand.muted, fontSize: 12, fontWeight: "700" },
  microcopyLight: { color: "#cbd2ff", fontSize: 12, fontWeight: "700" },
  rowTitle: { color: brand.ink, fontSize: 15, fontWeight: "900" },
  rowTitleLight: { color: "white", fontSize: 15, fontWeight: "900" },
  formRow: { gap: 10 },
  input: { minHeight: 48, borderWidth: 1, borderColor: brand.line, borderRadius: 14, paddingHorizontal: 14, backgroundColor: "white", color: brand.ink },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: brand.line, borderRadius: 18, padding: 14, backgroundColor: "white", color: brand.ink, textAlignVertical: "top" },
  textAreaSmall: { minHeight: 72, borderWidth: 1, borderColor: brand.line, borderRadius: 18, padding: 14, backgroundColor: "white", color: brand.ink, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 16, backgroundColor: brand.primary, paddingHorizontal: 16 },
  primaryButtonText: { color: "white", fontWeight: "900" },
  secondaryButton: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 16, backgroundColor: brand.surfaceAlt, paddingHorizontal: 16 },
  secondaryButtonText: { color: brand.primaryStrong, fontWeight: "900" },
  memberCard: { flexDirection: "row", gap: 12, borderWidth: 1, borderColor: brand.line, borderRadius: 20, padding: 12, backgroundColor: "#fbfcff" },
  smallAvatar: { width: 54, height: 54, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 18, backgroundColor: brand.surfaceAlt },
  smallAvatarImage: { width: 54, height: 54 },
  smallAvatarText: { color: brand.primary, fontSize: 24, fontWeight: "900" },
  memberInfo: { flex: 1, gap: 8 },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  facilitatorPill: { overflow: "hidden", borderRadius: 999, backgroundColor: "#e8fbf7", color: "#047a67", fontSize: 11, fontWeight: "900", paddingHorizontal: 8, paddingVertical: 4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statusPill: { borderWidth: 1, borderColor: brand.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "white" },
  statusPillActive: { borderColor: brand.primary, backgroundColor: brand.primary },
  statusPillText: { color: brand.muted, fontSize: 12, fontWeight: "900" },
  statusPillTextActive: { color: "white" },
  linkButton: { alignSelf: "flex-start" },
  linkText: { color: brand.primary, fontWeight: "900" },
  prayerPeopleRail: { gap: 8 },
  personChip: { borderWidth: 1, borderColor: brand.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "white" },
  personChipActive: { borderColor: brand.accent, backgroundColor: "#e8fbf7" },
  personChipText: { color: brand.ink, fontSize: 12, fontWeight: "900" },
  prayerCard: { gap: 4, borderLeftWidth: 4, borderLeftColor: brand.accent, borderRadius: 14, padding: 12, backgroundColor: "#f7fffd" },
  label: { color: brand.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  followUpGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 1, borderColor: brand.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "white" },
  choiceActive: { borderColor: brand.primary, backgroundColor: brand.surfaceAlt },
  choiceText: { color: brand.muted, fontSize: 12, fontWeight: "800" },
  choiceTextActive: { color: brand.primaryStrong },
  photoStrip: { alignItems: "center", gap: 10 },
  meetingPhoto: { width: 96, height: 96, borderRadius: 18, borderWidth: 1, borderColor: brand.line },
  actions: { flexDirection: "row", gap: 10 },
  queueRow: { borderTopWidth: 1, borderTopColor: brand.line, paddingTop: 10, gap: 3 },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(18,28,34,.45)", padding: 18 },
  modalCard: { width: "100%", maxWidth: 520, gap: 12, borderRadius: 24, padding: 18, backgroundColor: brand.surface },
});
