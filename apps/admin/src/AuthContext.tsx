"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SupportedLocale } from "@diaconia/shared";

export type CurrentUserProfile = {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
};

type AuthContextValue = {
  token: string;
  currentUser: CurrentUserProfile | null;
  isLoaded: boolean;
  locale: SupportedLocale;
  setToken: (token: string) => void;
  setLocale: (locale: SupportedLocale) => void;
  signIn: (token: string, profile: CurrentUserProfile) => void;
  signOut: () => void;
  updateProfile: (profile: CurrentUserProfile) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "diaconia:admin:accessToken";
const PROFILE_KEY = "diaconia:admin:profile";
const LOCALE_KEY = "diaconia:admin:locale";

export const defaultProfile: CurrentUserProfile = {
  displayName: "Diaconia Admin",
  email: "admin@diaconia.local",
  phone: "",
  avatarUrl: "",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [locale, setLocaleState] = useState<SupportedLocale>("es");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) ?? "";
    setTokenState(storedToken);

    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    if (storedLocale === "es" || storedLocale === "en") {
      setLocaleState(storedLocale);
    }

    const storedProfile = window.localStorage.getItem(PROFILE_KEY);
    if (storedProfile) {
      try {
        setCurrentUser(JSON.parse(storedProfile) as CurrentUserProfile);
      } catch {
        // ignore corrupt data
      }
    }

    setIsLoaded(true);
  }, []);

  function setToken(t: string) {
    setTokenState(t);
    window.localStorage.setItem(TOKEN_KEY, t);
  }

  function setLocale(l: SupportedLocale) {
    setLocaleState(l);
    window.localStorage.setItem(LOCALE_KEY, l);
  }

  function signIn(t: string, profile: CurrentUserProfile) {
    setTokenState(t);
    setCurrentUser(profile);
    window.localStorage.setItem(TOKEN_KEY, t);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function signOut() {
    setTokenState("");
    setCurrentUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
  }

  function updateProfile(profile: CurrentUserProfile) {
    setCurrentUser(profile);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        isLoaded,
        locale,
        setToken,
        setLocale,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
