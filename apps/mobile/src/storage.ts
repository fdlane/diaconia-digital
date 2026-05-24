import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedLocale } from "@diaconia/shared";
import type { LocalAttendee, LocalSession, LocalUser } from "./types";

const keys = {
  user: "diaconia:user",
  locale: "diaconia:locale",
  attendees: "diaconia:attendees",
  sessions: "diaconia:sessions",
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

export async function loadAttendees(defaults: LocalAttendee[]) {
  return readJson<LocalAttendee[]>(keys.attendees, defaults);
}

export async function saveAttendees(attendees: LocalAttendee[]) {
  await AsyncStorage.setItem(keys.attendees, JSON.stringify(attendees));
}

export async function loadSessions() {
  return readJson<LocalSession[]>(keys.sessions, []);
}

export async function saveSessions(sessions: LocalSession[]) {
  await AsyncStorage.setItem(keys.sessions, JSON.stringify(sessions));
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
