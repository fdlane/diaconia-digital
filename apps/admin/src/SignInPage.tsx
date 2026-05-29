"use client";

import { SignIn } from "@clerk/nextjs";
import { defaultProfile, useAuth } from "./AuthContext";
import { localizeAccessError, t } from "./adminLabels";

const devBypass = process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true";
const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

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

export function SignInPage() {
  const { signIn, locale, setLocale, accessError } = useAuth();
  const l = t(locale);
  const showDevSignIn = devBypass || !hasClerkKey;
  const localizedAccessError = accessError ? localizeAccessError(accessError, l) : "";

  return (
    <div className="signin-page">
      {showDevSignIn ? (
        <div className="signin-card">
          <div className="signin-logo">
            <img alt="Diaconia" src="/logo.png" />
          </div>
          <div className="signin-heading">
            <h1>Diaconia Admin</h1>
            <p>{l.signInSubtitle}</p>
          </div>
          {localizedAccessError ? <div className="alert alert-danger">{localizedAccessError}</div> : null}
          <button
            className="btn btn-primary"
            onClick={() => signIn("", defaultProfile)}
            disabled={!devBypass}
            style={{ width: "100%", height: "2.75rem", fontSize: "0.9375rem" }}
            type="button"
          >
            {l.signIn}
          </button>
          <LocaleToggle locale={locale} setLocale={setLocale} />
        </div>
      ) : (
        <div className="signin-clerk">
          {localizedAccessError ? <div className="alert alert-danger">{localizedAccessError}</div> : null}
          <SignIn
            appearance={clerkAppearance}
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
            routing="hash"
            signUpFallbackRedirectUrl="/"
            signUpForceRedirectUrl="/"
            signUpUrl="/sign-up"
          />
          <LocaleToggle locale={locale} setLocale={setLocale} />
        </div>
      )}
    </div>
  );
}

export function LocaleToggle({
  locale,
  setLocale,
}: {
  locale: "es" | "en";
  setLocale: (locale: "es" | "en") => void;
}) {
  return (
    <div
      className="locale-toggle"
      style={{ justifyContent: "center", marginTop: "1rem" }}
    >
      <button
        className={locale === "es" ? "locale-btn active" : "locale-btn"}
        onClick={() => setLocale("es")}
        type="button"
      >
        ES
      </button>
      <button
        className={locale === "en" ? "locale-btn active" : "locale-btn"}
        onClick={() => setLocale("en")}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
