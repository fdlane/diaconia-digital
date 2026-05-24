import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "../src/ClientLayout";

export const metadata: Metadata = {
  title: "Diaconia Admin",
  description: "Foundation dashboard for Diaconia field sessions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
