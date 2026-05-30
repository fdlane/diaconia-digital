import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedLocale } from "@diaconia/shared";
import type { MobileOfflineSnapshot } from "./offlineStore";
import type { LocalMeeting, LocalMember, LocalUser } from "./types";

const keys = {
  user: "diaconia:user",
  locale: "diaconia:locale",
  members: "diaconia:members",
  meetings: "diaconia:meetings",
  offlineSnapshot: "diaconia:offlineSnapshot:v1",
};

export async function loadUser() {
  return readJson<LocalUser | null>(keys.user, null);
}

export async function saveUser(user: LocalUser) {
  await AsyncStorage.setItem(keys.user, JSON.stringify(user));
}

export async function removeUser() {
  await AsyncStorage.removeItem(keys.user);
}

export async function loadLocale() {
  return readJson<SupportedLocale>(keys.locale, "es");
}

export async function saveLocale(locale: SupportedLocale) {
  await AsyncStorage.setItem(keys.locale, JSON.stringify(locale));
}

export async function loadMembers(defaults: LocalMember[]) {
  return readJson<LocalMember[]>(keys.members, defaults);
}

export async function saveMembers(members: LocalMember[]) {
  await AsyncStorage.setItem(keys.members, JSON.stringify(members));
}

export async function loadMeetings() {
  return readJson<LocalMeeting[]>(keys.meetings, []);
}

export async function saveMeetings(meetings: LocalMeeting[]) {
  await AsyncStorage.setItem(keys.meetings, JSON.stringify(meetings));
}

export async function loadOfflineSnapshot(fallback: MobileOfflineSnapshot) {
  return readJson<MobileOfflineSnapshot>(keys.offlineSnapshot, fallback);
}

export async function saveOfflineSnapshot(snapshot: MobileOfflineSnapshot) {
  await AsyncStorage.setItem(keys.offlineSnapshot, JSON.stringify(snapshot));
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
