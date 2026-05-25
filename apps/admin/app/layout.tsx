import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ClientLayout } from "../src/ClientLayout";

export const metadata: Metadata = {
  title: "Diaconia Admin",
  description: "Foundation dashboard for Diaconia field meetings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const app = <ClientLayout>{children}</ClientLayout>;
  const content = publishableKey ? <ClerkProvider>{app}</ClerkProvider> : app;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {content}
      </body>
    </html>
  );
}
