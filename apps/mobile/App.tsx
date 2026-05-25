import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FieldMeetingApp } from "./src/FieldMeetingApp";

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <FieldMeetingApp />
    </SafeAreaProvider>
  );
}
