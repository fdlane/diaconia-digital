"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";
import type { Role, SupportedLocale, UserStatus } from "@diaconia/shared";

export type CurrentUserProfile = {
  id?: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role?: Role;
  status?: UserStatus;
};

type AuthContextValue = {
  token: string;
  currentUser: CurrentUserProfile | null;
  isLoaded: boolean;
  accessError: string;
  locale: SupportedLocale;
  setToken: (token: string) => void;
  setLocale: (locale: SupportedLocale) => void;
  signIn: (token: string, profile: CurrentUserProfile) => void;
  signOut: () => void;
  updateProfile: (profile: CurrentUserProfile) => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCALE_KEY = "diaconia:admin:locale";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const jwtTemplate = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE ?? "diaconia-api";
const devBypass = process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true";
const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const fallbackTokenRefreshMs = 45_000;
const tokenRefreshSkewMs = 10_000;

export const defaultProfile: CurrentUserProfile = {
  id: "local-dev-user",
  displayName: "Diaconia Admin",
  email: "",
  phone: "+595000000000",
  avatarUrl: "",
  role: "admin",
  status: "active",
};

type MeResponse = {
  user: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string;
    role: Role;
    status: UserStatus;
    profilePhotoMediaId: string | null;
  };
};

function DevAuthProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("es");
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(
    devBypass ? defaultProfile : null,
  );

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    if (storedLocale === "es" || storedLocale === "en") {
      setLocaleState(storedLocale);
    }
  }, []);

  function setLocale(l: SupportedLocale) {
    setLocaleState(l);
    window.localStorage.setItem(LOCALE_KEY, l);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token: "",
      currentUser,
      isLoaded: true,
      accessError: devBypass ? "" : "CLERK_CONFIG_MISSING",
      locale,
      setToken: () => undefined,
      setLocale,
      signIn: (_token, profile) => setCurrentUser(profile),
      signOut: () => setCurrentUser(devBypass ? defaultProfile : null),
      updateProfile: setCurrentUser,
      refreshSession: async () => undefined,
    }),
    [currentUser, locale],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkBackedAuthProvider({ children }: { children: ReactNode }) {
  const clerkAuth = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { user: clerkUser } = useUser();
  const clerkLoaded = clerkAuth.isLoaded;
  const clerkSignedIn = clerkAuth.isSignedIn;
  const getClerkToken = clerkAuth.getToken;
  const [token, setTokenState] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [locale, setLocaleState] = useState<SupportedLocale>("es");
  const [isLoaded, setIsLoaded] = useState(false);
  const [accessError, setAccessError] = useState("");
  const hasLoadedSessionRef = useRef(false);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    if (storedLocale === "es" || storedLocale === "en") {
      setLocaleState(storedLocale);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    function markLoaded() {
      hasLoadedSessionRef.current = true;
      setIsLoaded(true);
    }

    if (devBypass) {
      setTokenState("");
      setCurrentUser(defaultProfile);
      setAccessError("");
      markLoaded();
      return;
    }

    if (!clerkLoaded) return;

    if (!clerkSignedIn) {
      setTokenState("");
      setCurrentUser(null);
      setAccessError("");
      markLoaded();
      return;
    }

    if (!hasLoadedSessionRef.current) {
      setIsLoaded(false);
    }
    const nextToken = await getClerkToken({ template: jwtTemplate });
    if (!nextToken) {
      setTokenState("");
      setCurrentUser(null);
      setAccessError("JWT_TEMPLATE_ERROR");
      markLoaded();
      return;
    }

    setTokenState(nextToken);
    const response = await fetch(`${apiUrl}/me`, {
      headers: { authorization: `Bearer ${nextToken}` },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
      setCurrentUser(null);
      setAccessError(payload?.code ?? payload?.error ?? "INVITE_REQUIRED");
      markLoaded();
      return;
    }

    const payload = (await response.json()) as MeResponse;
    if (payload.user.role !== "admin") {
      setCurrentUser(null);
      setAccessError("ADMIN_REQUIRED");
      markLoaded();
      return;
    }

    setCurrentUser({
      id: payload.user.id,
      displayName: payload.user.displayName,
      email: payload.user.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "",
      phone: payload.user.phone,
      avatarUrl: clerkUser?.imageUrl ?? "",
      role: payload.user.role,
      status: payload.user.status,
    });
    setAccessError("");
    markLoaded();
  }, [clerkLoaded, clerkSignedIn, getClerkToken, clerkUser?.imageUrl, clerkUser?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    void refreshSession().catch((error) => {
      setAccessError(error instanceof Error ? error.message : "SESSION_LOAD_FAILED");
      setCurrentUser(null);
      hasLoadedSessionRef.current = true;
      setIsLoaded(true);
    });
  }, [refreshSession]);

  useEffect(() => {
    if (!clerkSignedIn || devBypass || !token) return;

    const timeout = window.setTimeout(() => {
      void refreshSession();
    }, getTokenRefreshDelayMs(token));

    return () => window.clearTimeout(timeout);
  }, [clerkSignedIn, refreshSession, token]);

  function setToken(t: string) {
    setTokenState(t);
  }

  function setLocale(l: SupportedLocale) {
    setLocaleState(l);
    window.localStorage.setItem(LOCALE_KEY, l);
  }

  function signIn(_t: string, profile: CurrentUserProfile) {
    setCurrentUser(profile);
  }

  async function signOut() {
    setTokenState("");
    setCurrentUser(null);
    setAccessError("");
    if (!devBypass) {
      await clerkSignOut();
    }
  }

  function updateProfile(profile: CurrentUserProfile) {
    setCurrentUser(profile);
  }

  const value = useMemo(
    () => ({
      token,
      currentUser,
      isLoaded,
      accessError,
      locale,
      setToken,
      setLocale,
      signIn,
      signOut: () => {
        void signOut();
      },
      updateProfile,
      refreshSession,
    }),
    [token, currentUser, isLoaded, accessError, locale, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!hasClerkKey || devBypass) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  return <ClerkBackedAuthProvider>{children}</ClerkBackedAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function getTokenRefreshDelayMs(jwt: string) {
  const payload = parseJwtPayload(jwt);
  if (typeof payload?.exp !== "number") return fallbackTokenRefreshMs;

  const refreshAt = payload.exp * 1000 - Date.now() - tokenRefreshSkewMs;
  return Math.max(5_000, refreshAt);
}

function parseJwtPayload(jwt: string): { exp?: number } | null {
  const encodedPayload = jwt.split(".")[1];
  if (!encodedPayload) return null;

  try {
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}
