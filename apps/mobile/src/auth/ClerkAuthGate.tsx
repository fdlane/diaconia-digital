import { useAuth, useSSO, useUser } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { normalizePhoneNumber } from "@diaconia/shared";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import diaconiaLogo from "../../assets/logo.png";
import { getApiUrl } from "../config/endpoints";
import { getEffectivePublicEnv, getPublicEnvValue } from "../config/publicEnv";
import { FieldMeetingApp, type AuthenticatedSession } from "../FieldMeetingApp";
import type { LocalUser } from "../types";

WebBrowser.maybeCompleteAuthSession();

const jwtTemplate = getPublicEnvValue("EXPO_PUBLIC_CLERK_JWT_TEMPLATE", process.env, "NEXT_PUBLIC_CLERK_JWT_TEMPLATE") ?? "diaconia-api";
const redirectUrl = AuthSession.makeRedirectUri({ scheme: "diaconiamobile", path: "sign-in" });
const authLoadTimeoutMs = 15000;

const devUser: LocalUser = {
  id: "019e606b-ce98-7134-b1d1-958703c36595",
  displayName: "Administradora Demo",
  email: null,
  phone: "+595000000000",
  role: "admin",
  token: "",
  status: "active",
};

export const devAuthenticatedSession: AuthenticatedSession = {
  user: devUser,
  getToken: async () => "",
  signOut: async () => undefined,
};

type MeResponse = {
  user: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string;
    role: LocalUser["role"];
    status: LocalUser["status"];
  };
};

type Step = "phone" | "code" | "verify-social-phone";

function toLocalUser(payload: MeResponse["user"]): LocalUser {
  return {
    id: payload.id,
    displayName: payload.displayName,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    status: payload.status ?? "active",
    token: "",
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo completar el ingreso. Intentá de nuevo.";
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = authLoadTimeoutMs) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function ClerkAuthGate() {
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { setActive, signIn } = useSignIn();
  const { setActive: setActiveSignUp, signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [sessionUser, setSessionUser] = useState<LocalUser | null>(null);
  const [phone, setPhone] = useState("+595");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Preparando sesion segura");
  const [clerkLoadTimedOut, setClerkLoadTimedOut] = useState(false);
  const [internalUserRetry, setInternalUserRetry] = useState(0);
  const [error, setError] = useState("");
  const [pendingSocialPhone, setPendingSocialPhone] = useState<any>(null);
  const verifiedPhone = user?.primaryPhoneNumber?.phoneNumber ?? null;
  const getTokenRef = useRef(getToken);
  const internalUserLoadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const authenticatedSession = useMemo<AuthenticatedSession | null>(() => {
    if (!sessionUser) return null;
    return {
      user: sessionUser,
      getToken: async () => {
        const token = await getToken({ template: jwtTemplate });
        if (!token) throw new Error("No se pudo crear un token de sesion.");
        return token;
      },
      signOut: async () => {
        setSessionUser(null);
        await signOut();
      },
    };
  }, [getToken, sessionUser, signOut]);

  useEffect(() => {
    if (isLoaded) {
      setClerkLoadTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setClerkLoadTimedOut(true);
      setError("Clerk tardó demasiado en preparar la sesión. Recargá la página e intentá de nuevo.");
    }, authLoadTimeoutMs);

    return () => clearTimeout(timeout);
  }, [isLoaded]);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    async function loadInternalUser() {
      if (!isLoaded || !isSignedIn) {
        internalUserLoadKeyRef.current = null;
        setSessionUser(null);
        setLoading(false);
        return;
      }

      if (!verifiedPhone) {
        internalUserLoadKeyRef.current = null;
        setLoading(false);
        setStep("verify-social-phone");
        return;
      }

      const loadKey = `${verifiedPhone}:${internalUserRetry}`;
      if (internalUserLoadKeyRef.current === loadKey) return;
      internalUserLoadKeyRef.current = loadKey;

      setLoadingMessage("Cargando usuario de Diaconia");
      setLoading(true);
      setError("");
      try {
        const token = await withTimeout(
          getTokenRef.current({ template: jwtTemplate }),
          "La sesion de Clerk se creó, pero el token de API tardó demasiado.",
        );
        if (!active) return;
        if (!token) throw new Error("No se pudo crear un token de sesion.");
        const apiUrl = getApiUrl("/me", getEffectivePublicEnv(), Platform.OS);
        const response = await withTimeout(
          fetch(apiUrl, {
            headers: { authorization: `Bearer ${token}` },
            signal: abortController.signal,
          }),
          `La sesion se autenticó, pero la API tardó demasiado en cargar el usuario desde ${apiUrl}.`,
        );
        if (!active) return;
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Este numero no tiene invitacion activa.");
        }
        const payload = (await response.json()) as MeResponse;
        if (!active) return;
        setSessionUser(toLocalUser(payload.user));
      } catch (caughtError) {
        if (!active || abortController.signal.aborted) return;
        internalUserLoadKeyRef.current = null;
        setSessionUser(null);
        setError(getErrorMessage(caughtError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInternalUser();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [internalUserRetry, isLoaded, isSignedIn, verifiedPhone]);

  async function startPhoneOtp() {
    if (!signIn || !signUp) return;
    setLoadingMessage("Enviando código por SMS");
    setLoading(true);
    setError("");

    try {
      const phoneNumber = normalizePhoneNumber(phone);
      try {
        const attempt: any = await withTimeout(
          (signIn as any).create({ identifier: phoneNumber }),
          "Clerk tardó demasiado en iniciar el ingreso por SMS.",
        );
        const factor = attempt.supportedFirstFactors?.find((item: any) => item.strategy === "phone_code");
        if (factor?.phoneNumberId) {
          await withTimeout(
            (signIn as any).prepareFirstFactor({ strategy: "phone_code", phoneNumberId: factor.phoneNumberId }),
            "Clerk tardó demasiado en enviar el código por SMS.",
          );
          setStep("code");
          return;
        }
      } catch {
        // If the phone has not created a Clerk user yet, continue into sign-up.
      }

      await withTimeout((signUp as any).create({ phoneNumber }), "Clerk tardó demasiado en crear el usuario.");
      await withTimeout(
        (signUp as any).preparePhoneNumberVerification({ strategy: "phone_code" }),
        "Clerk tardó demasiado en enviar el código por SMS.",
      );
      setStep("code");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!signIn || !signUp) return;
    setLoadingMessage("Verificando código");
    setLoading(true);
    setError("");
    let sessionActivated = false;

    try {
      let sessionId: string | null = null;
      if ((signIn as any).status === "needs_first_factor") {
        const attempt: any = await withTimeout(
          (signIn as any).attemptFirstFactor({ strategy: "phone_code", code: code.trim() }),
          "Clerk tardó demasiado en verificar el código.",
        );
        sessionId = attempt.createdSessionId ?? null;
        if (attempt.status !== "complete") throw new Error("No se pudo verificar el codigo.");
      } else {
        const attempt: any = await withTimeout(
          (signUp as any).attemptPhoneNumberVerification({ code: code.trim() }),
          "Clerk tardó demasiado en verificar el código.",
        );
        sessionId = attempt.createdSessionId ?? null;
        if (attempt.status !== "complete") throw new Error("No se pudo verificar el codigo.");
      }

      const activate = setActive ?? setActiveSignUp;
      if (sessionId && activate) {
        setLoadingMessage("Abriendo Diaconia");
        await withTimeout(activate({ session: sessionId }), "Clerk tardó demasiado en activar la sesión.");
        sessionActivated = true;
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      if (!sessionActivated) setLoading(false);
    }
  }

  async function startSocial(strategy: "oauth_google" | "oauth_apple") {
    setLoadingMessage(strategy === "oauth_google" ? "Abriendo Google" : "Abriendo Apple");
    setLoading(true);
    setError("");
    let sessionActivated = false;
    try {
      const result: any = await withTimeout(
        startSSOFlow({ redirectUrl, strategy }),
        "Clerk tardó demasiado en completar el ingreso social.",
      );
      const sessionId =
        result.createdSessionId ??
        result.signIn?.createdSessionId ??
        result.signUp?.createdSessionId ??
        null;
      if (sessionId && result.setActive) {
        setLoadingMessage("Abriendo Diaconia");
        await withTimeout(result.setActive({ session: sessionId }), "Clerk tardó demasiado en activar la sesión.");
        sessionActivated = true;
        return;
      }
      throw new Error("No se pudo completar el ingreso social.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      if (!sessionActivated) setLoading(false);
    }
  }

  async function addSocialPhone() {
    if (!user) return;
    setLoadingMessage("Agregando teléfono");
    setLoading(true);
    setError("");
    try {
      const phoneNumber = normalizePhoneNumber(phone);
      const created: any = await withTimeout(
        (user as any).createPhoneNumber({ phoneNumber }),
        "Clerk tardó demasiado en agregar el teléfono.",
      );
      await withTimeout(created.prepareVerification(), "Clerk tardó demasiado en enviar el código por SMS.");
      setPendingSocialPhone(created);
      setStep("code");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function verifySocialPhone() {
    if (!pendingSocialPhone) return;
    setLoadingMessage("Verificando teléfono");
    setLoading(true);
    setError("");
    try {
      await withTimeout(
        pendingSocialPhone.attemptVerification({ code: code.trim() }),
        "Clerk tardó demasiado en verificar el teléfono.",
      );
      if (user) await withTimeout(user.reload(), "Clerk tardó demasiado en recargar el usuario.");
      setPendingSocialPhone(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  function reloadPage() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
    }
  }

  if (authenticatedSession) {
    return <FieldMeetingApp authenticatedSession={authenticatedSession} />;
  }

  if (clerkLoadTimedOut) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>Clerk tardó demasiado en preparar la sesión.</Text>
        <Text style={styles.help}>Recargá la página. Si sigue igual, cerrá esta pestaña y abrí el enlace de nuevo.</Text>
        {Platform.OS === "web" ? (
          <Pressable onPress={reloadPage} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Recargar</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    );
  }

  if (error && isSignedIn) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => setInternalUserRetry((value) => value + 1)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Intentar de nuevo</Text>
        </Pressable>
        <Pressable onPress={() => signOut()} style={styles.linkButton}>
          <Text style={styles.linkButtonText}>Salir y volver a ingresar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!isLoaded || loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#2e3192" />
        <Text style={styles.help}>{isLoaded ? loadingMessage : "Preparando Clerk"}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Image accessibilityIgnoresInvertColors source={diaconiaLogo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.heading}>
          <Text style={styles.title}>Diaconia Admin</Text>
          <Text style={styles.subtitle}>Ingresá con tu número de WhatsApp, Google o Apple.</Text>
        </View>
        {error ? (
          <View style={styles.alert}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
        {step === "phone" || step === "verify-social-phone" ? (
          <>
            <TextInput
              accessibilityLabel="Número de WhatsApp"
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+595..."
              style={styles.input}
              value={phone}
            />
            <Pressable accessibilityRole="button" onPress={step === "verify-social-phone" ? addSocialPhone : startPhoneOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Enviar código por SMS</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Código de verificación"
              keyboardType="number-pad"
              onChangeText={setCode}
              placeholder="Código"
              style={styles.input}
              value={code}
            />
            <Pressable accessibilityRole="button" onPress={pendingSocialPhone ? verifySocialPhone : verifyPhoneOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Verificar código</Text>
            </Pressable>
          </>
        )}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o continuá con</Text>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.socialRow}>
          <Pressable accessibilityRole="button" onPress={() => startSocial("oauth_google")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Google</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => startSocial("oauth_apple")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Apple</Text>
          </Pressable>
        </View>
        {isSignedIn ? (
          <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>Salir</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#f4f6fb", padding: 20 },
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#f4f6fb" },
  card: {
    width: "100%",
    maxWidth: 420,
    gap: 24,
    paddingHorizontal: 30,
    paddingVertical: 34,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dfe5ee",
    ...Platform.select({
      ios: { shadowColor: "#111827", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.14, shadowRadius: 34 },
      android: { elevation: 8 },
      web: { boxShadow: "0 24px 60px rgba(17, 24, 39, 0.14)" },
    }),
  },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  logo: { width: 220, height: 58 },
  heading: { alignItems: "center", gap: 10 },
  title: { color: "#17202a", fontSize: 26, fontWeight: "800", letterSpacing: -0.4, lineHeight: 32, textAlign: "center" },
  subtitle: { color: "#65717d", fontSize: 15, lineHeight: 22, textAlign: "center" },
  help: { color: "#65717d" },
  alert: { borderWidth: 1, borderColor: "#f0b8b8", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff5f5" },
  error: { color: "#b42318", fontWeight: "700", lineHeight: 19, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#dfe5ee",
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    color: "#17202a",
    backgroundColor: "#fff",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2e3192",
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: -4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#dfe5ee" },
  dividerText: { color: "#65717d", fontSize: 12, fontWeight: "700" },
  socialRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dfe5ee",
    backgroundColor: "#fff",
  },
  secondaryButtonText: { color: "#17202a", fontWeight: "700" },
  linkButton: { alignItems: "center", padding: 8 },
  linkButtonText: { color: "#2e3192", fontWeight: "700" },
});
