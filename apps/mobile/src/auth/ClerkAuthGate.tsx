import { useAuth, useSSO, useUser } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { normalizePhoneNumber } from "@diaconia/shared";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiUrl } from "../config/endpoints";
import { FieldMeetingApp, type AuthenticatedSession } from "../FieldMeetingApp";
import type { LocalUser } from "../types";

WebBrowser.maybeCompleteAuthSession();

const jwtTemplate = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE ?? "diaconia-api";
const redirectUrl = AuthSession.makeRedirectUri({ scheme: "diaconiamobile", path: "sign-in" });

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
  const [error, setError] = useState("");
  const [pendingSocialPhone, setPendingSocialPhone] = useState<any>(null);
  const verifiedPhone = user?.primaryPhoneNumber?.phoneNumber ?? null;

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
    async function loadInternalUser() {
      if (!isLoaded || !isSignedIn) {
        setSessionUser(null);
        return;
      }

      if (!verifiedPhone) {
        setStep("verify-social-phone");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const token = await getToken({ template: jwtTemplate });
        if (!token) throw new Error("No se pudo crear un token de sesion.");
        const response = await fetch(getApiUrl("/me", process.env, Platform.OS), {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Este numero no tiene invitacion activa.");
        }
        const payload = (await response.json()) as MeResponse;
        setSessionUser(toLocalUser(payload.user));
      } catch (caughtError) {
        setSessionUser(null);
        setError(getErrorMessage(caughtError));
      } finally {
        setLoading(false);
      }
    }

    void loadInternalUser();
  }, [getToken, isLoaded, isSignedIn, verifiedPhone]);

  async function startPhoneOtp() {
    if (!signIn || !signUp) return;
    setLoading(true);
    setError("");

    try {
      const phoneNumber = normalizePhoneNumber(phone);
      try {
        const attempt = await (signIn as any).create({ identifier: phoneNumber });
        const factor = attempt.supportedFirstFactors?.find((item: any) => item.strategy === "phone_code");
        if (factor?.phoneNumberId) {
          await (signIn as any).prepareFirstFactor({ strategy: "phone_code", phoneNumberId: factor.phoneNumberId });
          setStep("code");
          return;
        }
      } catch {
        // If the phone has not created a Clerk user yet, continue into sign-up.
      }

      await (signUp as any).create({ phoneNumber });
      await (signUp as any).preparePhoneNumberVerification({ strategy: "phone_code" });
      setStep("code");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!signIn || !signUp) return;
    setLoading(true);
    setError("");

    try {
      let sessionId: string | null = null;
      if ((signIn as any).status === "needs_first_factor") {
        const attempt = await (signIn as any).attemptFirstFactor({ strategy: "phone_code", code: code.trim() });
        sessionId = attempt.createdSessionId ?? null;
        if (attempt.status !== "complete") throw new Error("No se pudo verificar el codigo.");
      } else {
        const attempt = await (signUp as any).attemptPhoneNumberVerification({ code: code.trim() });
        sessionId = attempt.createdSessionId ?? null;
        if (attempt.status !== "complete") throw new Error("No se pudo verificar el codigo.");
      }

      const activate = setActive ?? setActiveSignUp;
      if (sessionId && activate) {
        await activate({ session: sessionId });
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function startSocial(strategy: "oauth_google" | "oauth_apple") {
    setLoading(true);
    setError("");
    try {
      const result: any = await startSSOFlow({ redirectUrl, strategy });
      const sessionId =
        result.createdSessionId ??
        result.signIn?.createdSessionId ??
        result.signUp?.createdSessionId ??
        null;
      if (sessionId && result.setActive) {
        await result.setActive({ session: sessionId });
        return;
      }
      throw new Error("No se pudo completar el ingreso social.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function addSocialPhone() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const phoneNumber = normalizePhoneNumber(phone);
      const created = await (user as any).createPhoneNumber({ phoneNumber });
      await created.prepareVerification();
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
    setLoading(true);
    setError("");
    try {
      await pendingSocialPhone.attemptVerification({ code: code.trim() });
      await user?.reload();
      setPendingSocialPhone(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  if (authenticatedSession) {
    return <FieldMeetingApp authenticatedSession={authenticatedSession} />;
  }

  if (!isLoaded || loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#2e3192" />
        <Text style={styles.help}>Preparando sesion segura</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Diaconia Mobile</Text>
        <Text style={styles.subtitle}>Ingresá con tu número de WhatsApp, Google o Apple.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {step === "phone" || step === "verify-social-phone" ? (
          <>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+595..."
              style={styles.input}
              value={phone}
            />
            <Pressable onPress={step === "verify-social-phone" ? addSocialPhone : startPhoneOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Enviar codigo por SMS</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setCode}
              placeholder="Codigo"
              style={styles.input}
              value={code}
            />
            <Pressable onPress={pendingSocialPhone ? verifySocialPhone : verifyPhoneOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Verificar codigo</Text>
            </Pressable>
          </>
        )}
        <View style={styles.socialRow}>
          <Pressable onPress={() => startSocial("oauth_google")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Google</Text>
          </Pressable>
          <Pressable onPress={() => startSocial("oauth_apple")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Apple</Text>
          </Pressable>
        </View>
        {isSignedIn ? (
          <Pressable onPress={() => signOut()} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>Salir</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#f4f6fb" },
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#f4f6fb" },
  card: { width: "100%", maxWidth: 520, gap: 14, padding: 22, backgroundColor: "#fff", borderRadius: 8 },
  title: { color: "#17202a", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#65717d", fontSize: 15, lineHeight: 21 },
  help: { color: "#65717d" },
  error: { color: "#d64545", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#dfe5ee",
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    color: "#17202a",
    backgroundColor: "#fff",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2e3192",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  socialRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dfe5ee",
  },
  secondaryButtonText: { color: "#17202a", fontWeight: "700" },
  linkButton: { alignItems: "center", padding: 8 },
  linkButtonText: { color: "#2e3192", fontWeight: "700" },
});
