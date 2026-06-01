import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import type { SupportedLocale } from "@diaconia/shared";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkAuthGate, devAuthenticatedSession } from "./src/auth/ClerkAuthGate";
import { getPublicEnvValue } from "./src/config/publicEnv";
import { FieldMeetingApp } from "./src/FieldMeetingApp";
import { loadLocale, saveLocale } from "./src/storage";

const publishableKey = getPublicEnvValue(
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  process.env,
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
);
const devBypass = getPublicEnvValue("EXPO_PUBLIC_AUTH_DEV_BYPASS") === "true";

const missingAuthCopy = {
  es: {
    title: "Falta configurar el inicio de sesión seguro",
    body: "Configure la clave pública de autenticación para usar el inicio de sesión.",
  },
  en: {
    title: "Secure sign-in is not configured",
    body: "Configure the public authentication key to use sign-in.",
  },
} satisfies Record<SupportedLocale, { title: string; body: string }>;

export default function App() {
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const missingAuthText = missingAuthCopy[locale];

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

  const content =
    !publishableKey && devBypass ? (
      <FieldMeetingApp authenticatedSession={devAuthenticatedSession} />
    ) : !publishableKey ? (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: "#17202a", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
          {missingAuthText.title}
        </Text>
        <Text style={{ color: "#65717d", marginTop: 8, textAlign: "center" }}>
          {missingAuthText.body}
        </Text>
        <View style={{ flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: "#dfe5ee", borderRadius: 999, backgroundColor: "#fff", marginTop: 18 }}>
          {(["es", "en"] as const).map((option) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: locale === option }}
              key={option}
              onPress={() => updateLocale(option)}
              style={{ minWidth: 44, paddingHorizontal: 12, paddingVertical: 7, alignItems: "center", backgroundColor: locale === option ? "#2e3192" : "#fff" }}
            >
              <Text style={{ color: locale === option ? "#fff" : "#65717d", fontSize: 12, fontWeight: "800" }}>
                {option.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    ) : (
      <ClerkProvider publishableKey={publishableKey} {...(tokenCache ? { tokenCache } : {})}>
        <ClerkAuthGate />
      </ClerkProvider>
    );

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {content}
    </SafeAreaProvider>
  );
}
