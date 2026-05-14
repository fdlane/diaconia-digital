import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FieldSessionApp } from "./src/FieldSessionApp";

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <FieldSessionApp />
    </SafeAreaProvider>
  );
}
