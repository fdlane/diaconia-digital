"use client";

import { SignUp } from "@clerk/nextjs";
import { useAuth } from "./AuthContext";
import { LocaleToggle } from "./SignInPage";

const clerkAppearance = {
  elements: {
    cardBox: "clerk-auth-card",
    rootBox: "clerk-auth-root",
  },
  variables: {
    borderRadius: "0.625rem",
    colorPrimary: "#2e3192",
  },
};

export function SignUpPage() {
  const { locale, setLocale } = useAuth();

  return (
    <div className="signin-page">
      <div className="signin-clerk">
        <SignUp
          appearance={clerkAppearance}
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          routing="hash"
          signInFallbackRedirectUrl="/"
          signInForceRedirectUrl="/"
          signInUrl="/"
        />
        <LocaleToggle locale={locale} setLocale={setLocale} />
      </div>
    </div>
  );
}
