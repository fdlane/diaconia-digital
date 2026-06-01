import { useAuth, useSSO, useUser } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { normalizePhoneNumber, type SupportedLocale } from "@diaconia/shared";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import diaconiaLogo from "../../assets/logo.png";
import { getApiUrl } from "../config/endpoints";
import { getEffectivePublicEnv, getPublicEnvValue } from "../config/publicEnv";
import { FieldMeetingApp, type AuthenticatedSession } from "../FieldMeetingApp";
import { loadLocale, saveLocale } from "../storage";
import type { LocalUser } from "../types";

WebBrowser.maybeCompleteAuthSession();

const jwtTemplate = getPublicEnvValue("EXPO_PUBLIC_CLERK_JWT_TEMPLATE", process.env, "NEXT_PUBLIC_CLERK_JWT_TEMPLATE") ?? "diaconia-api";
const redirectUrl = AuthSession.makeRedirectUri({ scheme: "diaconiamobile", path: "sign-in" });
const authLoadTimeoutMs = 15000;
const googleIconUri =
  "data:image/png;base64,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";

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
type AuthErrorKey =
  | "authAccountNotFound"
  | "authAdminRequired"
  | "authAlreadySignedIn"
  | "authGenericError"
  | "authInvalidCode"
  | "authInvalidSession"
  | "authInviteRequired"
  | "authMissingClerkConfig"
  | "authMissingPhone"
  | "authMissingSession"
  | "authSessionLoadFailed"
  | "authTokenTemplateError";

const authCopy = {
  es: {
    addPhone: "Agregando telefono",
    addPhoneTimeout: "El inicio seguro tardó demasiado en agregar el teléfono.",
    apiUserTimeout: "La sesion se autentico, pero la API tardo demasiado en cargar el usuario.",
    apiTokenTimeout: "La sesión se creó, pero la API tardó demasiado en preparar el acceso.",
    appleSignIn: "Apple",
    authAccountNotFound: "No encontramos una cuenta para ese número.",
    authAdminRequired: "Tu cuenta no tiene rol de administrador.",
    authAlreadySignedIn: "Ya hay una sesión iniciada. Salí de esa sesión e intentá de nuevo.",
    authGenericError: "No se pudo completar el ingreso. Intentá de nuevo.",
    authInvalidCode: "El código no es válido. Verificá el código e intentá de nuevo.",
    authInvalidSession: "Tu sesión expiró o no es válida. Salí e ingresá de nuevo.",
    authInviteRequired: "Tu cuenta existe, pero todavía no está habilitada para acceder a Diaconia.",
    authMissingClerkConfig: "Falta configurar el inicio de sesión seguro.",
    authMissingPhone: "Ingresá un número de teléfono válido.",
    authMissingSession: "Iniciá sesión para continuar.",
    authSessionLoadFailed: "No se pudo cargar la sesión.",
    authTokenTemplateError: "No se pudo crear un token de sesión. Verificá la configuración de autenticación.",
    clerkLoading: "Preparando inicio seguro",
    clerkTimeout: "El inicio seguro tardó demasiado en preparar la sesión.",
    clerkTimeoutHelp: "Recarga la pagina. Si sigue igual, cerra esta pestana y abri el enlace de nuevo.",
    clerkTimeoutRetry: "El inicio seguro tardó demasiado en preparar la sesión. Recargá la página e intentá de nuevo.",
    codeLabel: "Codigo de verificacion",
    codePlaceholder: "Codigo",
    continueWith: "o",
    googleSignIn: "Google",
    loadingDiaconia: "Abriendo Diaconia",
    loadingGoogle: "Abriendo Google",
    loadingApple: "Abriendo Apple",
    loadingSecure: "Preparando sesion segura",
    loadingUser: "Cargando usuario de Diaconia",
    noApiToken: "No se pudo crear un token de sesión. Verificá la configuración de autenticación.",
    phoneLabel: "Numero de WhatsApp",
    phoneSubtitle: "Por favor ingresá para continuar",
    reload: "Recargar",
    retry: "Intentar de nuevo",
    sendCode: "Enviar codigo por SMS",
    sendCodeLoading: "Enviando codigo por SMS",
    signInTimeout: "El inicio seguro tardó demasiado en iniciar el ingreso por SMS.",
    signOut: "Salir",
    signOutAndRetry: "Salir y volver a ingresar",
    signUpTimeout: "El inicio seguro tardó demasiado en crear el usuario.",
    socialError: "No se pudo completar el ingreso social.",
    socialTimeout: "El inicio seguro tardó demasiado en completar el ingreso social.",
    tokenActivateTimeout: "El inicio seguro tardó demasiado en activar la sesión.",
    userReloadTimeout: "El inicio seguro tardó demasiado en recargar el usuario.",
    verify: "Verificar codigo",
    verifyCodeLoading: "Verificando codigo",
    verifyCodeTimeout: "El inicio seguro tardó demasiado en verificar el código.",
    verifyFailed: "No se pudo verificar el codigo.",
    verifyPhoneLoading: "Verificando telefono",
    verifyPhoneTimeout: "El inicio seguro tardó demasiado en verificar el teléfono.",
    smsCodeTimeout: "El inicio seguro tardó demasiado en enviar el código por SMS.",
  },
  en: {
    addPhone: "Adding phone",
    addPhoneTimeout: "Secure sign-in took too long to add the phone.",
    apiUserTimeout: "The session was authenticated, but the API took too long to load the user.",
    apiTokenTimeout: "The session was created, but the API took too long to prepare access.",
    appleSignIn: "Apple",
    authAccountNotFound: "Could not find an account for that number.",
    authAdminRequired: "Your account does not have the administrator role.",
    authAlreadySignedIn: "You are already signed in. Sign out of that session and try again.",
    authGenericError: "Could not complete sign in. Try again.",
    authInvalidCode: "The code is not valid. Check the code and try again.",
    authInvalidSession: "Your session expired or is not valid. Sign out and sign in again.",
    authInviteRequired: "Your account exists, but it is not enabled for Diaconia access yet.",
    authMissingClerkConfig: "Secure sign-in is not configured.",
    authMissingPhone: "Enter a valid phone number.",
    authMissingSession: "Sign in to continue.",
    authSessionLoadFailed: "Could not load the session.",
    authTokenTemplateError: "Could not create a session token. Check the authentication configuration.",
    clerkLoading: "Preparing secure sign-in",
    clerkTimeout: "Secure sign-in took too long to prepare the session.",
    clerkTimeoutHelp: "Reload the page. If it still happens, close this tab and open the link again.",
    clerkTimeoutRetry: "Secure sign-in took too long to prepare the session. Reload the page and try again.",
    codeLabel: "Verification code",
    codePlaceholder: "Code",
    continueWith: "or",
    googleSignIn: "Google",
    loadingDiaconia: "Opening Diaconia",
    loadingGoogle: "Opening Google",
    loadingApple: "Opening Apple",
    loadingSecure: "Preparing secure session",
    loadingUser: "Loading Diaconia user",
    noApiToken: "Could not create a session token. Check the authentication configuration.",
    phoneLabel: "WhatsApp number",
    phoneSubtitle: "Please sign in to continue",
    reload: "Reload",
    retry: "Try again",
    sendCode: "Send SMS code",
    sendCodeLoading: "Sending SMS code",
    signInTimeout: "Secure sign-in took too long to start SMS sign-in.",
    signOut: "Sign out",
    signOutAndRetry: "Sign out and sign in again",
    signUpTimeout: "Secure sign-in took too long to create the user.",
    socialError: "Could not complete social sign in.",
    socialTimeout: "Secure sign-in took too long to complete social sign in.",
    tokenActivateTimeout: "Secure sign-in took too long to activate the session.",
    userReloadTimeout: "Secure sign-in took too long to reload the user.",
    verify: "Verify code",
    verifyCodeLoading: "Verifying code",
    verifyCodeTimeout: "Secure sign-in took too long to verify the code.",
    verifyFailed: "Could not verify the code.",
    verifyPhoneLoading: "Verifying phone",
    verifyPhoneTimeout: "Secure sign-in took too long to verify the phone.",
    smsCodeTimeout: "Secure sign-in took too long to send the SMS code.",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

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

function getErrorKey(error: unknown): AuthErrorKey {
  const message = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return localizeAuthErrorKey(`${code} ${message}`.trim());
}

function localizeApiErrorKey(payload: { code?: string; error?: string } | null): AuthErrorKey {
  if (payload?.code === "INVITE_REQUIRED" || /invited active user required/i.test(payload?.error ?? "")) {
    return "authInviteRequired";
  }
  if (payload?.code === "ADMIN_REQUIRED" || /admin role required/i.test(payload?.error ?? "")) {
    return "authAdminRequired";
  }
  if (payload?.code === "AUTH_CONFIG_MISSING" || /missing .*verifier configuration/i.test(payload?.error ?? "")) {
    return "authMissingClerkConfig";
  }
  if (payload?.code === "UNAUTHENTICATED" || /invalid bearer token/i.test(payload?.error ?? "")) {
    return "authInvalidSession";
  }
  if (/missing bearer token/i.test(payload?.error ?? "")) {
    return "authMissingSession";
  }
  return "authGenericError";
}

function localizeAuthErrorKey(message: string): AuthErrorKey {
  if (!message) return "authGenericError";
  if (/invited active user required|invite_required|not enabled|not habilitada/i.test(message)) return "authInviteRequired";
  if (/admin role required|admin_required|administrator role|rol de administrador/i.test(message)) return "authAdminRequired";
  if (/auth_config_missing|publishable_key|sign-in is not configured|secure sign-in is not configured/i.test(message)) {
    return "authMissingClerkConfig";
  }
  if (/jwt_template_error|session token|token de sesión|template|plantilla/i.test(message)) return "authTokenTemplateError";
  if (/already signed in/i.test(message)) return "authAlreadySignedIn";
  if (/not found|could not find|identifier|account.*number|cuenta.*n[uú]mero/i.test(message)) return "authAccountNotFound";
  if (/invalid.*code|code.*invalid|incorrect.*code|could not verify|verification.*failed|no se pudo verificar|c[oó]digo.*no.*v[aá]lido/i.test(message)) {
    return "authInvalidCode";
  }
  if (/phone.*required|missing.*phone|valid phone|n[uú]mero.*v[aá]lido/i.test(message)) return "authMissingPhone";
  if (/session_load_failed|failed to fetch|load failed|network request failed|took too long|tard[oó] demasiado|cargar la sesi[oó]n/i.test(message)) {
    return "authSessionLoadFailed";
  }
  if (/unauthenticated|invalid bearer token|session.*expired|session.*invalid/i.test(message)) return "authInvalidSession";
  return "authGenericError";
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
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const [phone, setPhone] = useState("+595");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(authCopy.es.loadingSecure);
  const [clerkLoadTimedOut, setClerkLoadTimedOut] = useState(false);
  const [internalUserRetry, setInternalUserRetry] = useState(0);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [pendingSocialPhone, setPendingSocialPhone] = useState<any>(null);
  const verifiedPhone = user?.primaryPhoneNumber?.phoneNumber ?? null;
  const getTokenRef = useRef(getToken);
  const internalUserLoadKeyRef = useRef<string | null>(null);
  const text = authCopy[locale];
  const errorMessage = errorKey ? text[errorKey] : "";

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let active = true;
    void loadLocale().then((storedLocale) => {
      if (active) setLocale(storedLocale);
    });
    return () => {
      active = false;
    };
  }, []);

  async function updateLocale(nextLocale: SupportedLocale) {
    setLocale(nextLocale);
    await saveLocale(nextLocale);
  }

  const authenticatedSession = useMemo<AuthenticatedSession | null>(() => {
    if (!sessionUser) return null;
    return {
      user: sessionUser,
      getToken: async () => {
        const token = await getToken({ template: jwtTemplate });
        if (!token) throw new Error(text.noApiToken);
        return token;
      },
      signOut: async () => {
        setSessionUser(null);
        await signOut();
      },
    };
  }, [getToken, sessionUser, signOut, text.noApiToken]);

  useEffect(() => {
    if (isLoaded) {
      setClerkLoadTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setClerkLoadTimedOut(true);
      setErrorKey("authSessionLoadFailed");
    }, authLoadTimeoutMs);

    return () => clearTimeout(timeout);
  }, [isLoaded, text.clerkTimeoutRetry]);

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

      setLoadingMessage(text.loadingUser);
      setLoading(true);
      setErrorKey(null);
      try {
        const token = await withTimeout(
          getTokenRef.current({ template: jwtTemplate }),
          text.apiTokenTimeout,
        );
        if (!active) return;
        if (!token) throw new Error(text.noApiToken);
        const apiUrl = getApiUrl("/me", getEffectivePublicEnv(), Platform.OS);
        const response = await withTimeout(
          fetch(apiUrl, {
            headers: { authorization: `Bearer ${token}` },
            signal: abortController.signal,
          }),
          `${text.apiUserTimeout} ${apiUrl}`,
        );
        if (!active) return;
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { code?: string; error?: string } | null;
          setErrorKey(localizeApiErrorKey(payload));
          return;
        }
        const payload = (await response.json()) as MeResponse;
        if (!active) return;
        setSessionUser(toLocalUser(payload.user));
      } catch (caughtError) {
        if (!active || abortController.signal.aborted) return;
        internalUserLoadKeyRef.current = null;
        setSessionUser(null);
        setErrorKey(getErrorKey(caughtError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInternalUser();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [internalUserRetry, isLoaded, isSignedIn, text, verifiedPhone]);

  async function startPhoneOtp() {
    if (!signIn || !signUp) return;
    setLoadingMessage(text.sendCodeLoading);
    setLoading(true);
    setErrorKey(null);

    try {
      const phoneNumber = normalizePhoneNumber(phone);
      try {
        const attempt: any = await withTimeout(
          (signIn as any).create({ identifier: phoneNumber }),
          text.signInTimeout,
        );
        const factor = attempt.supportedFirstFactors?.find((item: any) => item.strategy === "phone_code");
        if (factor?.phoneNumberId) {
          await withTimeout(
            (signIn as any).prepareFirstFactor({ strategy: "phone_code", phoneNumberId: factor.phoneNumberId }),
            text.smsCodeTimeout,
          );
          setStep("code");
          return;
        }
      } catch {
        // If the phone has not created a Clerk user yet, continue into sign-up.
      }

      await withTimeout((signUp as any).create({ phoneNumber }), text.signUpTimeout);
      await withTimeout(
        (signUp as any).preparePhoneNumberVerification({ strategy: "phone_code" }),
        text.smsCodeTimeout,
      );
      setStep("code");
    } catch (caughtError) {
      setErrorKey(getErrorKey(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!signIn || !signUp) return;
    setLoadingMessage(text.verifyCodeLoading);
    setLoading(true);
    setErrorKey(null);
    let sessionActivated = false;

    try {
      let sessionId: string | null = null;
      if ((signIn as any).status === "needs_first_factor") {
        const attempt: any = await withTimeout(
          (signIn as any).attemptFirstFactor({ strategy: "phone_code", code: code.trim() }),
          text.verifyCodeTimeout,
        );
        sessionId = attempt.createdSessionId ?? null;
        if (attempt.status !== "complete") throw new Error(text.verifyFailed);
      } else {
        const attempt: any = await withTimeout(
          (signUp as any).attemptPhoneNumberVerification({ code: code.trim() }),
          text.verifyCodeTimeout,
        );
        sessionId = attempt.createdSessionId ?? null;
        if (attempt.status !== "complete") throw new Error(text.verifyFailed);
      }

      const activate = setActive ?? setActiveSignUp;
      if (sessionId && activate) {
        setLoadingMessage(text.loadingDiaconia);
        await withTimeout(activate({ session: sessionId }), text.tokenActivateTimeout);
        sessionActivated = true;
      }
    } catch (caughtError) {
      setErrorKey(getErrorKey(caughtError));
    } finally {
      if (!sessionActivated) setLoading(false);
    }
  }

  async function startSocial(strategy: "oauth_google" | "oauth_apple") {
    setLoadingMessage(strategy === "oauth_google" ? text.loadingGoogle : text.loadingApple);
    setLoading(true);
    setErrorKey(null);
    let sessionActivated = false;
    try {
      const result: any = await withTimeout(
        startSSOFlow({ redirectUrl, strategy }),
        text.socialTimeout,
      );
      const sessionId =
        result.createdSessionId ??
        result.signIn?.createdSessionId ??
        result.signUp?.createdSessionId ??
        null;
      if (sessionId && result.setActive) {
        setLoadingMessage(text.loadingDiaconia);
        await withTimeout(result.setActive({ session: sessionId }), text.tokenActivateTimeout);
        sessionActivated = true;
        return;
      }
      throw new Error(text.socialError);
    } catch (caughtError) {
      setErrorKey(getErrorKey(caughtError));
    } finally {
      if (!sessionActivated) setLoading(false);
    }
  }

  async function addSocialPhone() {
    if (!user) return;
    setLoadingMessage(text.addPhone);
    setLoading(true);
    setErrorKey(null);
    try {
      const phoneNumber = normalizePhoneNumber(phone);
      const created: any = await withTimeout(
        (user as any).createPhoneNumber({ phoneNumber }),
        text.addPhoneTimeout,
      );
      await withTimeout(created.prepareVerification(), text.smsCodeTimeout);
      setPendingSocialPhone(created);
      setStep("code");
    } catch (caughtError) {
      setErrorKey(getErrorKey(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function verifySocialPhone() {
    if (!pendingSocialPhone) return;
    setLoadingMessage(text.verifyPhoneLoading);
    setLoading(true);
    setErrorKey(null);
    try {
      await withTimeout(
        pendingSocialPhone.attemptVerification({ code: code.trim() }),
        text.verifyPhoneTimeout,
      );
      if (user) await withTimeout(user.reload(), text.userReloadTimeout);
      setPendingSocialPhone(null);
    } catch (caughtError) {
      setErrorKey(getErrorKey(caughtError));
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
        <Text style={styles.error}>{text.clerkTimeout}</Text>
        <Text style={styles.help}>{text.clerkTimeoutHelp}</Text>
        {Platform.OS === "web" ? (
          <Pressable onPress={reloadPage} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{text.reload}</Text>
          </Pressable>
        ) : null}
        <LocaleToggle locale={locale} setLocale={updateLocale} />
      </SafeAreaView>
    );
  }

  if (errorKey && isSignedIn) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{errorMessage}</Text>
        <Pressable onPress={() => setInternalUserRetry((value) => value + 1)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{text.retry}</Text>
        </Pressable>
        <Pressable onPress={() => signOut()} style={styles.linkButton}>
          <Text style={styles.linkButtonText}>{text.signOutAndRetry}</Text>
        </Pressable>
        <LocaleToggle locale={locale} setLocale={updateLocale} />
      </SafeAreaView>
    );
  }

  if (!isLoaded || loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#2e3192" />
        <Text style={styles.help}>{isLoaded ? loadingMessage : text.clerkLoading}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Image accessibilityIgnoresInvertColors source={diaconiaLogo} style={styles.logo} resizeMode="contain" />
        </View>
        <LocaleToggle locale={locale} setLocale={updateLocale} />
        <View style={styles.heading}>
          <Text style={styles.subtitle}>{text.phoneSubtitle}</Text>
        </View>
        {errorKey ? (
          <View style={styles.alert}>
            <Text style={styles.error}>{errorMessage}</Text>
          </View>
        ) : null}
        <View style={styles.socialRow}>
          <Pressable accessibilityRole="button" onPress={() => startSocial("oauth_apple")} style={styles.secondaryButton}>
            <AppleIcon />
            <Text style={styles.secondaryButtonText}>{text.appleSignIn}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => startSocial("oauth_google")} style={styles.secondaryButton}>
            <GoogleIcon />
            <Text style={styles.secondaryButtonText}>{text.googleSignIn}</Text>
          </Pressable>
        </View>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{text.continueWith}</Text>
          <View style={styles.dividerLine} />
        </View>
        {step === "phone" || step === "verify-social-phone" ? (
          <>
            <TextInput
              accessibilityLabel={text.phoneLabel}
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+595..."
              style={styles.input}
              value={phone}
            />
            <Pressable accessibilityRole="button" onPress={step === "verify-social-phone" ? addSocialPhone : startPhoneOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{text.sendCode}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel={text.codeLabel}
              keyboardType="number-pad"
              onChangeText={setCode}
              placeholder={text.codePlaceholder}
              style={styles.input}
              value={code}
            />
            <Pressable accessibilityRole="button" onPress={pendingSocialPhone ? verifySocialPhone : verifyPhoneOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{text.verify}</Text>
            </Pressable>
          </>
        )}
        {isSignedIn ? (
          <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>{text.signOut}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function LocaleToggle({
  locale,
  setLocale,
}: {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.localeToggle}>
      {(["es", "en"] as const).map((option) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: locale === option }}
          key={option}
          onPress={() => setLocale(option)}
          style={[styles.localeButton, locale === option && styles.localeButtonActive]}
        >
          <Text style={[styles.localeButtonText, locale === option && styles.localeButtonTextActive]}>
            {option.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AppleIcon() {
  return <Text style={styles.appleIcon}>{"\uF8FF"}</Text>;
}

function GoogleIcon() {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri: googleIconUri }}
      style={styles.googleIcon}
      resizeMode="contain"
    />
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
  heading: { alignItems: "center" },
  subtitle: { color: "#65717d", fontSize: 14, lineHeight: 22, textAlign: "center" },
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
  localeToggle: {
    alignSelf: "center",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#dfe5ee",
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  localeButton: { minWidth: 44, paddingHorizontal: 12, paddingVertical: 7, alignItems: "center" },
  localeButtonActive: { backgroundColor: "#2e3192" },
  localeButtonText: { color: "#65717d", fontSize: 12, fontWeight: "800" },
  localeButtonTextActive: { color: "#fff" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: -4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#dfe5ee" },
  dividerText: { color: "#65717d", fontSize: 14, fontWeight: "500" },
  socialRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#dadce0",
    backgroundColor: "#fff",
    ...Platform.select({
      ios: { shadowColor: "#3c4043", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 2px rgba(60, 64, 67, 0.08)" },
    }),
  },
  secondaryButtonText: { color: "#3c4043", fontSize: 14, fontWeight: "600" },
  appleIcon: { color: "#000", fontSize: 18, lineHeight: 20 },
  googleIcon: { width: 18, height: 18 },
  linkButton: { alignItems: "center", padding: 8 },
  linkButtonText: { color: "#2e3192", fontWeight: "700" },
});
