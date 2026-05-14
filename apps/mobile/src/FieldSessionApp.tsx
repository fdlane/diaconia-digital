import { labels, type AttendanceStatus, type FollowUpCategory } from "@diaconia/shared";
import * as Crypto from "expo-crypto";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pickImage } from "./media";
import { defaultGroupId, seedAttendees, seedGroups } from "./seed";
import { replaySessionWrite, uploadPhotoAsset } from "./sync/zero";
import {
  loadAttendees,
  loadSessions,
  loadUser,
  saveAttendees,
  saveSessions,
  saveUser,
} from "./storage";
import type { LocalAttendee, LocalGroup, LocalSession, LocalUser } from "./types";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const copy = labels.es;
const brand = {
  background: "#f5f6fb",
  surface: "#ffffff",
  surfaceAlt: "#eef0ff",
  ink: "#1f2531",
  muted: "#4a5257",
  line: "#e0e1e4",
  primary: "#2e3192",
  primaryStrong: "#202369",
  dark: "#121c22",
};

export function FieldSessionApp() {
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
  const [status, setStatus] = useState("Listo");

  useEffect(() => {
    async function hydrate() {
      setUser(await loadUser());
      setAttendees(await loadAttendees(seedAttendees));
      setSessions(await loadSessions());
    }

    void hydrate();
  }, []);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ??
    groups.find((group) => group.id === defaultGroupId) ??
    ({
      id: defaultGroupId,
      name: "Grupo demo",
      community: "Paraguay",
    } satisfies LocalGroup);
  const groupAttendees = useMemo(
    () => attendees.filter((attendee) => attendee.groupId === selectedGroup.id),
    [attendees, selectedGroup.id],
  );

  async function signIn() {
    const nextUser: LocalUser = {
      id: "55faf062-c862-4449-85a8-a97e14886b1d",
      displayName: "Facilitadora Demo",
      token: "local-dev-token",
    };
    setUser(nextUser);
    await saveUser(nextUser);
  }

  async function updateUserPhoto() {
    if (!user) {
      return;
    }

    const photo = await pickImage("user_profile_photo");
    if (!photo) {
      return;
    }

    let remoteMediaId = user.profilePhotoRemoteMediaId;
    try {
      remoteMediaId = await uploadPhotoAsset({
        apiUrl,
        token: user.token,
        photo,
        ownerUserId: user.id,
      });
      await fetch(`${apiUrl}/me/profile-photo`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${user.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ mediaId: remoteMediaId }),
      });
    } catch {
      setStatus("Foto de perfil pendiente");
    }

    const nextUser: LocalUser = remoteMediaId
      ? { ...user, profilePhotoUri: photo.uri, profilePhotoRemoteMediaId: remoteMediaId }
      : { ...user, profilePhotoUri: photo.uri };
    setUser(nextUser);
    await saveUser(nextUser);
  }

  async function updateAttendeePhoto(attendeeId: string) {
    const photo = await pickImage("attendee_profile_photo");
    if (!photo) {
      return;
    }

    let remoteMediaId: string | undefined;
    try {
      remoteMediaId = await uploadPhotoAsset({
        apiUrl,
        token: user?.token ?? "",
        photo,
        attendeeId,
      });
      await fetch(`${apiUrl}/attendees/${attendeeId}/profile-photo`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${user?.token ?? ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ mediaId: remoteMediaId }),
      });
    } catch {
      setStatus("Foto de asistente pendiente");
    }

    const nextAttendees: LocalAttendee[] = attendees.map((attendee) => {
      if (attendee.id !== attendeeId) {
        return attendee;
      }

      return remoteMediaId
        ? { ...attendee, profilePhotoUri: photo.uri, profilePhotoRemoteMediaId: remoteMediaId }
        : { ...attendee, profilePhotoUri: photo.uri };
    });
    setAttendees(nextAttendees);
    await saveAttendees(nextAttendees);
  }

  async function addMeetingPhoto() {
    const photo = await pickImage("meeting_photo");
    if (photo) {
      setMeetingPhotos((value) => [...value, photo]);
    }
  }

  async function saveDraft(syncNow: boolean) {
    if (!user) {
      return;
    }

    const session: LocalSession = {
      id: Crypto.randomUUID(),
      groupId: selectedGroup.id,
      heldAt: new Date().toISOString(),
      notes,
      followUpCategory,
      followUpNotes,
      attendance: Object.fromEntries(
        groupAttendees.map((attendee) => [attendee.id, attendance[attendee.id] ?? "present"]),
      ),
      meetingPhotos,
      syncStatus: syncNow ? "pending" : "draft",
    };

    const nextSessions = [session, ...sessions];
    setSessions(nextSessions);
    await saveSessions(nextSessions);
    setNotes("");
    setFollowUpCategory("none");
    setFollowUpNotes("");
    setMeetingPhotos([]);
    setStatus(syncNow ? "Sesion guardada para sincronizar" : "Borrador guardado");

    if (syncNow) {
      await syncPending(nextSessions);
    }
  }

  async function syncPending(source = sessions) {
    if (!user) {
      return;
    }

    setStatus("Sincronizando");
    const nextSessions: LocalSession[] = [];

    for (const session of source) {
      if (session.syncStatus === "synced") {
        nextSessions.push(session);
        continue;
      }

      try {
        const uploadedMeetingPhotos = [];
        for (const photo of session.meetingPhotos) {
          const remoteMediaId =
            photo.remoteMediaId ??
            (await uploadPhotoAsset({
              apiUrl,
              token: user.token,
              photo,
              sessionId: session.id,
            }));
          uploadedMeetingPhotos.push({ ...photo, uploaded: true, remoteMediaId });
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
            attendance: Object.entries(session.attendance).map(([attendeeId, status]) => ({
              attendeeId,
              status,
            })),
            meetingPhotoMediaIds: uploadedMeetingPhotos
              .map((photo) => photo.remoteMediaId)
              .filter((id): id is string => Boolean(id)),
          },
        });
        nextSessions.push({ ...session, meetingPhotos: uploadedMeetingPhotos, syncStatus: "synced" });
      } catch {
        nextSessions.push({ ...session, syncStatus: "failed" });
      }
    }

    setSessions(nextSessions);
    await saveSessions(nextSessions);
    setStatus(nextSessions.some((session) => session.syncStatus === "failed") ? "Hay errores" : "Sincronizado");
  }

  const appContent = !user ? (
    <View style={styles.signIn}>
          <Text style={styles.kicker}>Diaconia</Text>
          <Text style={styles.title}>{copy.appName}</Text>
          <Text style={styles.body}>
            Ingreso de facilitadores con Cognito. En desarrollo local se usa un usuario demo para
            validar el flujo de campo.
          </Text>
          <Pressable onPress={signIn} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.signIn}</Text>
          </Pressable>
        </View>
  ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Diaconia</Text>
            <Text style={styles.title}>{copy.appName}</Text>
            <Text style={styles.body}>{user.displayName}</Text>
          </View>
          <Pressable onPress={updateUserPhoto} style={styles.avatarButton}>
            {user.profilePhotoUri ? (
              <Image source={{ uri: user.profilePhotoUri }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>Foto</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.groups}</Text>
          <View style={styles.groupGrid}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => setSelectedGroupId(group.id)}
                style={[styles.groupCard, group.id === selectedGroup.id && styles.groupCardActive]}
              >
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.body}>{group.community}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.attendance}</Text>
          {groupAttendees.map((attendee) => (
            <View key={attendee.id} style={styles.attendeeRow}>
              <Pressable onPress={() => updateAttendeePhoto(attendee.id)} style={styles.smallAvatar}>
                {attendee.profilePhotoUri ? (
                  <Image source={{ uri: attendee.profilePhotoUri }} style={styles.smallAvatarImage} />
                ) : (
                  <Text style={styles.smallAvatarText}>+</Text>
                )}
              </Pressable>
              <View style={styles.attendeeName}>
                <Text style={styles.rowTitle}>{attendee.displayName}</Text>
                <Text style={styles.body}>{attendee.phone}</Text>
              </View>
              {(["present", "absent", "excused"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setAttendance((state) => ({ ...state, [attendee.id]: value }))}
                  style={[
                    styles.statusPill,
                    (attendance[attendee.id] ?? "present") === value && styles.statusPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      (attendance[attendee.id] ?? "present") === value &&
                        styles.statusPillTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.notes}</Text>
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Notas de la reunion"
            style={styles.textArea}
            value={notes}
          />
          <Text style={styles.label}>{copy.followUp}</Text>
          <View style={styles.followUpGrid}>
            {(["none", "financial", "training", "wellbeing", "documentation", "other"] as const).map(
              (value) => (
                <Pressable
                  key={value}
                  onPress={() => setFollowUpCategory(value)}
                  style={[styles.choice, followUpCategory === value && styles.choiceActive]}
                >
                  <Text style={[styles.choiceText, followUpCategory === value && styles.choiceTextActive]}>
                    {value}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <TextInput
            onChangeText={setFollowUpNotes}
            placeholder="Detalle de seguimiento"
            style={styles.input}
            value={followUpNotes}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.photos}</Text>
            <Pressable onPress={addMeetingPhoto} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Agregar</Text>
            </Pressable>
          </View>
          <View style={styles.photoStrip}>
            {meetingPhotos.map((photo) => (
              <Image key={photo.id} source={{ uri: photo.uri }} style={styles.meetingPhoto} />
            ))}
            {!meetingPhotos.length ? <Text style={styles.body}>Sin fotos de reunion.</Text> : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => saveDraft(false)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Guardar borrador</Text>
          </Pressable>
          <Pressable onPress={() => saveDraft(true)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Guardar y sincronizar</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cola local</Text>
            <Pressable onPress={() => syncPending()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
          <Text style={styles.body}>{status}</Text>
          {sessions.slice(0, 5).map((session) => (
            <View key={session.id} style={styles.queueRow}>
              <Text style={styles.rowTitle}>{new Date(session.heldAt).toLocaleString("es-PY")}</Text>
              <Text style={styles.body}>{session.syncStatus}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appSurface}>{appContent}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: "center",
    backgroundColor: brand.background,
    minHeight: 640,
  },
  appSurface: {
    flex: 1,
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 520,
        backgroundColor: brand.background,
        boxShadow: `0 18px 48px rgba(18, 28, 34, 0.08)`,
      },
    }),
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32,
  },
  signIn: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    minHeight: 640,
    padding: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kicker: {
    color: brand.primary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: brand.ink,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  body: {
    color: brand.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    backgroundColor: brand.surface,
    borderColor: brand.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: brand.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  groupGrid: {
    gap: 10,
  },
  groupCard: {
    borderColor: brand.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  groupCardActive: {
    borderColor: brand.primary,
    backgroundColor: brand.surfaceAlt,
  },
  groupName: {
    color: brand.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  avatarButton: {
    alignItems: "center",
    backgroundColor: brand.surfaceAlt,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  avatar: {
    height: 56,
    width: 56,
  },
  avatarText: {
    color: brand.primaryStrong,
    fontWeight: "800",
  },
  attendeeRow: {
    alignItems: "center",
    borderBottomColor: brand.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
  },
  smallAvatar: {
    alignItems: "center",
    backgroundColor: brand.surfaceAlt,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    overflow: "hidden",
    width: 36,
  },
  smallAvatarImage: {
    height: 36,
    width: 36,
  },
  smallAvatarText: {
    color: brand.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  attendeeName: {
    flex: 1,
  },
  rowTitle: {
    color: brand.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  statusPill: {
    borderColor: brand.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusPillActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  statusPillText: {
    color: brand.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  statusPillTextActive: {
    color: "#ffffff",
  },
  label: {
    color: brand.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    borderColor: brand.line,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 44,
    padding: 10,
  },
  textArea: {
    borderColor: brand.line,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 96,
    padding: 10,
    textAlignVertical: "top",
  },
  followUpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    borderColor: brand.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  choiceActive: {
    backgroundColor: brand.surfaceAlt,
    borderColor: brand.primary,
  },
  choiceText: {
    color: brand.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  choiceTextActive: {
    color: brand.primaryStrong,
  },
  photoStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meetingPhoto: {
    borderRadius: 6,
    height: 92,
    width: 92,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: brand.primary,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: brand.surfaceAlt,
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: brand.primaryStrong,
    fontWeight: "800",
  },
  queueRow: {
    borderTopColor: brand.line,
    borderTopWidth: 1,
    gap: 2,
    paddingTop: 10,
  },
});
