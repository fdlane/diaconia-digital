import {
  formatDisplayDate,
  getProfileInitials,
  labels,
  type AttendanceStatus,
  type FollowUpCategory,
  type Role,
  type SupportedLocale,
} from "@diaconia/shared";
import * as Crypto from "expo-crypto";
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
import { pickImage } from "./media";
import { adminUserId, defaultGroupId, facilitatorUserId, seedAttendees, seedGroups } from "./seed";
import { replaySessionWrite, uploadPhotoAsset } from "./sync/zero";
import {
  loadAttendees,
  loadLocale,
  loadSessions,
  loadUser,
  removeUser,
  saveAttendees,
  saveLocale,
  saveSessions,
  saveUser,
} from "./storage";
import type { LocalAttendee, LocalGroup, LocalPrayerRequest, LocalSession, LocalUser } from "./types";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
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
    cognitoToken: "Token Cognito",
    cognitoTokenHelp: "Pega un ID token de Cognito cuando el pool esté configurado; demo local sigue disponible.",
    saveProfile: "Guardar perfil",
    signOut: "Cerrar sesión",
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
    cognitoToken: "Cognito token",
    cognitoTokenHelp: "Paste a Cognito ID token once the user pool is configured; local demo stays available.",
    saveProfile: "Save profile",
    signOut: "Sign out",
    cancel: "Cancel",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

function statusLabel(status: AttendanceStatus, locale: SupportedLocale) {
  return ui[locale][status];
}

export function FieldSessionApp() {
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const [user, setUser] = useState<LocalUser | null>(null);
  const [groups] = useState<LocalGroup[]>(seedGroups);
  const [attendees, setAttendees] = useState<LocalAttendee[]>(seedAttendees);
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);
  const [notes, setNotes] = useState("");
  const [followUpCategory, setFollowUpCategory] = useState<FollowUpCategory>("none");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [meetingPhotos, setMeetingPhotos] = useState<LocalSession["meetingPhotos"]>([]);
  const [prayerRequests, setPrayerRequests] = useState<LocalPrayerRequest[]>([]);
  const [selectedPrayerAttendeeId, setSelectedPrayerAttendeeId] = useState<string | null>(null);
  const [newPrayer, setNewPrayer] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [cognitoToken, setCognitoToken] = useState("");
  const copy = labels[locale];
  const text = ui[locale];
  const [status, setStatus] = useState(copy.ready);

  useEffect(() => {
    async function hydrate() {
      const storedLocale = await loadLocale();
      setLocale(storedLocale);
      const storedUser = await loadUser();
      setUser(storedUser);
      if (storedUser) {
        setProfileName(storedUser.displayName);
        setProfileEmail(storedUser.email ?? "");
        setProfilePhone(storedUser.phone ?? "");
        setCognitoToken(storedUser.token === "local-dev-token" ? "" : storedUser.token);
      }
      setAttendees(await loadAttendees(seedAttendees));
      setSessions(await loadSessions());
    }

    void hydrate();
  }, []);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? {
      id: defaultGroupId,
      name: "Grupo demo",
      community: "Paraguay",
    };
  const groupAttendees = useMemo(
    () => attendees.filter((attendee) => attendee.groupId === selectedGroup.id),
    [attendees, selectedGroup.id],
  );
  const presentCount = groupAttendees.filter((attendee) => (attendance[attendee.id] ?? "present") === "present").length;
  const canAdmin = user?.role === "admin";

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
    setCognitoToken(nextUser.token === "local-dev-token" ? "" : nextUser.token);
    await saveUser(nextUser);
  }

  async function saveProfile() {
    if (!user) return;
    const nextUser: LocalUser = {
      ...user,
      displayName: profileName.trim() || user.displayName,
      email: profileEmail.trim() || null,
      phone: profilePhone.trim() || null,
      token: cognitoToken.trim() || user.token,
    };
    setUser(nextUser);
    await saveUser(nextUser);
    setProfileEditorOpen(false);
    setProfileMenuOpen(false);
  }

  async function signOut() {
    setUser(null);
    setProfileMenuOpen(false);
    setProfileEditorOpen(false);
    setCognitoToken("");
    await removeUser();
  }

  async function updateUserPhoto() {
    if (!user) return;
    const photo = await pickImage("user_profile_photo");
    if (!photo) return;
    let remoteMediaId = user.profilePhotoRemoteMediaId;
    try {
      remoteMediaId = await uploadPhotoAsset({ apiUrl, token: user.token, photo, ownerUserId: user.id });
      await fetch(`${apiUrl}/me/profile-photo`, {
        method: "POST",
        headers: { authorization: `Bearer ${user.token}`, "content-type": "application/json" },
        body: JSON.stringify({ mediaId: remoteMediaId }),
      });
    } catch {
      setStatus(copy.profilePhotoPending);
    }
    const nextUser = remoteMediaId
      ? { ...user, profilePhotoUri: photo.uri, profilePhotoRemoteMediaId: remoteMediaId }
      : { ...user, profilePhotoUri: photo.uri };
    setUser(nextUser);
    await saveUser(nextUser);
  }

  async function updateAttendeePhoto(attendeeId: string) {
    const photo = await pickImage("attendee_profile_photo");
    if (!photo) return;
    let remoteMediaId: string | undefined;
    try {
      remoteMediaId = await uploadPhotoAsset({ apiUrl, token: user?.token ?? "", photo, attendeeId });
      await fetch(`${apiUrl}/attendees/${attendeeId}/profile-photo`, {
        method: "POST",
        headers: { authorization: `Bearer ${user?.token ?? ""}`, "content-type": "application/json" },
        body: JSON.stringify({ mediaId: remoteMediaId }),
      });
    } catch {
      setStatus(copy.attendeePhotoPending);
    }
    const nextAttendees = attendees.map((attendee) =>
      attendee.id === attendeeId
        ? remoteMediaId
          ? { ...attendee, profilePhotoUri: photo.uri, profilePhotoRemoteMediaId: remoteMediaId }
          : { ...attendee, profilePhotoUri: photo.uri }
        : attendee,
    );
    setAttendees(nextAttendees);
    await saveAttendees(nextAttendees);
  }

  async function addMeetingPhoto() {
    const photo = await pickImage("meeting_photo");
    if (photo) setMeetingPhotos((value) => [...value, photo]);
  }

  async function addPerson() {
    if (!newPersonName.trim()) return;
    const phone = newPersonPhone.trim();
    const nextPerson: LocalAttendee = {
      id: Crypto.randomUUID(),
      groupId: selectedGroup.id,
      displayName: newPersonName.trim(),
      ...(phone ? { phone } : {}),
    };
    const nextAttendees = [...attendees, nextPerson];
    setAttendees(nextAttendees);
    await saveAttendees(nextAttendees);
    setNewPersonName("");
    setNewPersonPhone("");
  }

  async function toggleFacilitator(attendeeId: string) {
    const nextAttendees = attendees.map((attendee) =>
      attendee.id === attendeeId ? { ...attendee, isFacilitator: !attendee.isFacilitator } : attendee,
    );
    setAttendees(nextAttendees);
    await saveAttendees(nextAttendees);
  }

  function addPrayerRequest() {
    if (!newPrayer.trim()) return;
    const attendee = groupAttendees.find((person) => person.id === selectedPrayerAttendeeId);
    setPrayerRequests((value) => [
      ...value,
      {
        id: Crypto.randomUUID(),
        attendeeId: attendee?.id ?? null,
        requesterName: attendee?.displayName ?? "Grupo",
        request: newPrayer.trim(),
      },
    ]);
    setNewPrayer("");
  }

  async function saveDraft(syncNow: boolean) {
    if (!user) return;
    const session: LocalSession = {
      id: Crypto.randomUUID(),
      groupId: selectedGroup.id,
      heldAt: new Date().toISOString(),
      notes,
      followUpCategory,
      followUpNotes,
      attendance: Object.fromEntries(groupAttendees.map((attendee) => [attendee.id, attendance[attendee.id] ?? "present"])),
      prayerRequests,
      meetingPhotos,
      syncStatus: syncNow ? "pending" : "draft",
    };
    const nextSessions = [session, ...sessions];
    setSessions(nextSessions);
    await saveSessions(nextSessions);
    setNotes("");
    setFollowUpCategory("none");
    setFollowUpNotes("");
    setPrayerRequests([]);
    setMeetingPhotos([]);
    setStatus(syncNow ? copy.sessionQueued : copy.draftSaved);
    if (syncNow) await syncPending(nextSessions);
  }

  async function syncPending(source = sessions) {
    if (!user) return;
    setStatus(copy.syncing);
    const nextSessions: LocalSession[] = [];
    for (const session of source) {
      if (session.syncStatus !== "pending" && session.syncStatus !== "failed") {
        nextSessions.push(session);
        continue;
      }
      let uploadedMeetingPhotos = session.meetingPhotos;
      try {
        for (const photo of session.meetingPhotos) {
          const remoteMediaId = photo.remoteMediaId ?? (await uploadPhotoAsset({ apiUrl, token: user.token, photo }));
          uploadedMeetingPhotos = uploadedMeetingPhotos.map((candidate) =>
            candidate.id === photo.id ? { ...candidate, uploaded: true, remoteMediaId } : candidate,
          );
        }
        await replaySessionWrite({
          apiUrl,
          token: user.token,
          payload: {
            id: session.id,
            groupId: session.groupId,
            heldAt: session.heldAt,
            notes: session.notes,
            followUpCategory: session.followUpCategory,
            followUpNotes: session.followUpNotes,
            attendance: Object.entries(session.attendance).map(([attendeeId, value]) => ({ attendeeId, status: value })),
            prayerRequests: session.prayerRequests,
            meetingPhotoMediaIds: uploadedMeetingPhotos.map((photo) => photo.remoteMediaId).filter((id): id is string => Boolean(id)),
          },
        });
        nextSessions.push({ ...session, meetingPhotos: uploadedMeetingPhotos, syncStatus: "synced" });
      } catch {
        nextSessions.push({ ...session, meetingPhotos: uploadedMeetingPhotos, syncStatus: "failed" });
      }
    }
    setSessions(nextSessions);
    await saveSessions(nextSessions);
    setStatus(nextSessions.some((session) => session.syncStatus === "failed") ? copy.syncError : copy.syncComplete);
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
              onChangeText={setCognitoToken}
              placeholder={text.cognitoToken}
              style={styles.input}
              value={cognitoToken}
            />
            <Text style={styles.microcopy}>{text.cognitoTokenHelp}</Text>
            <Pressable onPress={() => signIn("facilitator", cognitoToken)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{text.facilitatorMode}</Text>
            </Pressable>
            <Pressable onPress={() => signIn("admin", cognitoToken)} style={styles.secondaryButton}>
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
          <Metric label={text.metricsAttendance} value={`${presentCount}/${groupAttendees.length}`} />
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
              <TextInput onChangeText={setNewPersonName} placeholder={text.newPersonName} style={styles.input} value={newPersonName} />
              <TextInput onChangeText={setNewPersonPhone} placeholder={text.newPersonPhone} style={styles.input} value={newPersonPhone} />
            </View>
            <Pressable onPress={addPerson} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{text.addPerson}</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.attendance}</Text>
          {groupAttendees.map((attendee) => (
            <View key={attendee.id} style={styles.attendeeCard}>
              <Pressable onPress={() => updateAttendeePhoto(attendee.id)} style={styles.smallAvatar}>
                {attendee.profilePhotoUri ? <Image source={{ uri: attendee.profilePhotoUri }} style={styles.smallAvatarImage} /> : <Text style={styles.smallAvatarText}>+</Text>}
              </Pressable>
              <View style={styles.attendeeInfo}>
                <View style={styles.nameLine}>
                  <Text style={styles.rowTitle}>{attendee.displayName}</Text>
                  {attendee.isFacilitator ? <Text style={styles.facilitatorPill}>{text.facilitatorBadge}</Text> : null}
                </View>
                <Text style={styles.body}>{attendee.phone}</Text>
                <View style={styles.statusRow}>
                  {(["present", "absent", "excused"] as const).map((value) => (
                    <Pressable key={value} onPress={() => setAttendance((state) => ({ ...state, [attendee.id]: value }))} style={[styles.statusPill, (attendance[attendee.id] ?? "present") === value && styles.statusPillActive]}>
                      <Text style={[styles.statusPillText, (attendance[attendee.id] ?? "present") === value && styles.statusPillTextActive]}>{statusLabel(value, locale)}</Text>
                    </Pressable>
                  ))}
                </View>
                {canAdmin ? (
                  <Pressable onPress={() => toggleFacilitator(attendee.id)} style={styles.linkButton}>
                    <Text style={styles.linkText}>{attendee.isFacilitator ? text.removeFacilitator : text.makeFacilitator}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.prayerRequests}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prayerPeopleRail}>
            <Pressable onPress={() => setSelectedPrayerAttendeeId(null)} style={[styles.personChip, selectedPrayerAttendeeId === null && styles.personChipActive]}><Text style={styles.personChipText}>Grupo</Text></Pressable>
            {groupAttendees.map((attendee) => (
              <Pressable key={attendee.id} onPress={() => setSelectedPrayerAttendeeId(attendee.id)} style={[styles.personChip, selectedPrayerAttendeeId === attendee.id && styles.personChipActive]}><Text style={styles.personChipText}>{attendee.displayName}</Text></Pressable>
            ))}
          </ScrollView>
          <TextInput multiline onChangeText={setNewPrayer} placeholder={text.prayerPlaceholder} style={styles.textAreaSmall} value={newPrayer} />
          <Pressable onPress={addPrayerRequest} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{text.addPrayer}</Text></Pressable>
          {prayerRequests.length ? prayerRequests.map((request) => (
            <View key={request.id} style={styles.prayerCard}><Text style={styles.rowTitle}>{request.requesterName}</Text><Text style={styles.body}>{request.request}</Text></View>
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
          {sessions.slice(0, 5).map((session) => (
            <View key={session.id} style={styles.queueRow}>
              <Text style={styles.rowTitle}>{formatDisplayDate(session.heldAt, locale)}</Text>
              <Text style={styles.body}>{session.syncStatus} · {Object.values(session.attendance).filter((value) => value === "present").length} / {Object.keys(session.attendance).length}</Text>
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
            <TextInput autoCapitalize="none" multiline onChangeText={setCognitoToken} placeholder={text.cognitoToken} style={styles.textAreaSmall} value={cognitoToken} />
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
  attendeeCard: { flexDirection: "row", gap: 12, borderWidth: 1, borderColor: brand.line, borderRadius: 20, padding: 12, backgroundColor: "#fbfcff" },
  smallAvatar: { width: 54, height: 54, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 18, backgroundColor: brand.surfaceAlt },
  smallAvatarImage: { width: 54, height: 54 },
  smallAvatarText: { color: brand.primary, fontSize: 24, fontWeight: "900" },
  attendeeInfo: { flex: 1, gap: 8 },
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
