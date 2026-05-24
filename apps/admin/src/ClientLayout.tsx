"use client";

import { AuthProvider } from "./AuthContext";
import { AppShell } from "./AppShell";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
