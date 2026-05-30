import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkAuthGate, devAuthenticatedSession } from "./src/auth/ClerkAuthGate";
import { getPublicEnvValue } from "./src/config/publicEnv";
import { FieldMeetingApp } from "./src/FieldMeetingApp";

const publishableKey = getPublicEnvValue(
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  process.env,
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
);
const devBypass = getPublicEnvValue("EXPO_PUBLIC_AUTH_DEV_BYPASS") === "true";

export default function App() {
  const content =
    !publishableKey && devBypass ? (
      <FieldMeetingApp authenticatedSession={devAuthenticatedSession} />
    ) : !publishableKey ? (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: "#17202a", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
          Falta configurar Clerk
        </Text>
        <Text style={{ color: "#65717d", marginTop: 8, textAlign: "center" }}>
          Configure EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY para usar autenticacion.
        </Text>
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
