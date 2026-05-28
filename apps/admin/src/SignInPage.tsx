"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { normalizePhoneNumber } from "@diaconia/shared";
import { useState, type FormEvent } from "react";
import { defaultProfile, useAuth } from "./AuthContext";
import { localizeAccessError, t } from "./adminLabels";

const devBypass = process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true";
const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const phoneCountryOptions = [
  { value: "PY", label: "PY +595", dialCode: "+595", placeholder: "981 000000" },
  { value: "US", label: "US +1", dialCode: "+1", placeholder: "865 555 0100" },
  { value: "BR", label: "BR +55", dialCode: "+55", placeholder: "11 99999 0000" },
  { value: "AR", label: "AR +54", dialCode: "+54", placeholder: "9 11 5555 0000" },
  { value: "CL", label: "CL +56", dialCode: "+56", placeholder: "9 5555 0000" },
  { value: "UY", label: "UY +598", dialCode: "+598", placeholder: "99 000 000" },
  { value: "BO", label: "BO +591", dialCode: "+591", placeholder: "70000000" },
  { value: "other", label: "Other", dialCode: "", placeholder: "+44 7700 900123" },
] as const;

export function SignInPage() {
  const { signIn, signOut, refreshSession, locale, setLocale, accessError } = useAuth();
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
          {localizedAccessError ? (
            <div className="signin-access-error">
              <div className="alert alert-danger">{localizedAccessError}</div>
              <div className="signin-access-actions">
                <button className="btn btn-secondary" onClick={() => void refreshSession()} type="button">
                  {l.authTryAgain}
                </button>
                <button className="btn btn-primary" onClick={signOut} type="button">
                  {l.signOut}
                </button>
              </div>
            </div>
          ) : null}
          {localizedAccessError ? null : <ClerkPhoneSignIn labels={l} />}
          <LocaleToggle locale={locale} setLocale={setLocale} />
        </div>
      )}
    </div>
  );
}

function ClerkPhoneSignIn({ labels }: { labels: ReturnType<typeof t> }) {
  const { fetchStatus, signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const [country, setCountry] = useState<(typeof phoneCountryOptions)[number]["value"]>("PY");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const clerkLoaded = Boolean(clerkSignIn);
  const busy = loading || fetchStatus === "fetching";

  async function startPhoneOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clerkSignIn) return;

    setLoading(true);
    setError("");

    try {
      const selectedCountry = phoneCountryOptions.find((option) => option.value === country) ?? phoneCountryOptions[0];
      const phoneNumber =
        selectedCountry.value === "other"
          ? normalizePhoneNumber(phone)
          : normalizePhoneNumber(`${selectedCountry.dialCode}${phone.replace(/\D/g, "")}`);
      throwClerkError((await clerkSignIn.create({ identifier: phoneNumber, signUpIfMissing: true })).error);
      throwClerkError((await clerkSignIn.phoneCode.sendCode({ phoneNumber })).error);
      setStep("code");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, labels));
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clerkSignIn) return;

    setLoading(true);
    setError("");

    try {
      const verification = await clerkSignIn.phoneCode.verifyCode({ code: code.trim() });
      if (isSignUpIfMissingTransfer(verification.error)) {
        if (!clerkSignUp) throwClerkError(verification.error);

        throwClerkError((await clerkSignUp.create({ transfer: true })).error);
        throwClerkError((await clerkSignUp.finalize()).error);
        return;
      }

      throwClerkError(verification.error);
      throwClerkError((await clerkSignIn.finalize()).error);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, labels));
    } finally {
      setLoading(false);
    }
  }

  async function startSocial(strategy: "oauth_apple" | "oauth_google") {
    if (!clerkSignIn) return;

    setLoading(true);
    setError("");

    try {
      throwClerkError((await clerkSignIn.sso({
        strategy,
        redirectUrl: "/",
        redirectCallbackUrl: "/sso-callback",
      })).error);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, labels));
      setLoading(false);
    }
  }

  return (
    <div className="custom-auth-card">
      <div className="custom-auth-logo">
        <img alt="Diaconia" src="/logo.png" />
      </div>
      <div className="custom-auth-heading">
        <p>{labels.authSubtitle}</p>
      </div>

      <div className="social-row">
        <button className="social-btn" disabled={busy || !clerkLoaded} onClick={() => void startSocial("oauth_apple")} type="button">
          <AppleBrandIcon />
          {labels.appleSignIn}
        </button>
        <button className="social-btn" disabled={busy || !clerkLoaded} onClick={() => void startSocial("oauth_google")} type="button">
          <GoogleBrandIcon />
          {labels.googleSignIn}
        </button>
      </div>

      <div className="auth-divider">
        <span />
        <strong>{labels.socialOr}</strong>
        <span />
      </div>

      {step === "phone" ? (
        <form className="custom-auth-form" onSubmit={startPhoneOtp}>
          <label htmlFor="phone">{labels.phoneNumber}</label>
          <div className="phone-input-row">
            <select
              aria-label={labels.phoneCountry}
              onChange={(event) => {
                setCountry(event.target.value as (typeof phoneCountryOptions)[number]["value"]);
              }}
              value={country}
            >
              {phoneCountryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              autoComplete={country === "other" ? "tel" : "tel-national"}
              id="phone"
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              placeholder={phoneCountryOptions.find((option) => option.value === country)?.placeholder}
              value={phone}
            />
          </div>
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <button className="btn btn-primary auth-submit" disabled={busy || !clerkLoaded} type="submit">
            {loading ? labels.sendingCode : labels.continue}
          </button>
        </form>
      ) : (
        <form className="custom-auth-form" onSubmit={verifyPhoneOtp}>
          <label htmlFor="code">{labels.verificationCode}</label>
          <input
            autoComplete="one-time-code"
            className="auth-input"
            id="code"
            inputMode="numeric"
            onChange={(event) => setCode(event.target.value)}
            placeholder={labels.verificationCodePlaceholder}
            value={code}
          />
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <button className="btn btn-primary auth-submit" disabled={busy || !clerkLoaded} type="submit">
            {loading ? labels.verifying : labels.verify}
          </button>
          <button className="btn btn-secondary auth-submit" disabled={loading} onClick={() => setStep("phone")} type="button">
            {labels.useDifferentNumber}
          </button>
        </form>
      )}
      <div id="clerk-captcha" />
    </div>
  );
}

function AppleBrandIcon() {
  return (
    <svg aria-hidden="true" className="brand-icon" viewBox="0 0 24 24">
      <path
        d="M17.3 12.9c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.5-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.1-2.3 1.1-2.4 0 0-2.2-.8-2.2-3.4ZM15.2 6.7c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.7-1 1.6-.9 2.6.9.1 1.9-.5 2.5-1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleBrandIcon() {
  return (
    <svg aria-hidden="true" className="brand-icon" viewBox="0 0 24 24">
      <path
        d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.7 8.2 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.4l3.3-2.6Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.3 3.1 7.6l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function throwClerkError(error: any) {
  if (!error) return;
  throw error;
}

function isSignUpIfMissingTransfer(error: any) {
  return error?.code === "sign_up_if_missing_transfer" || error?.errors?.some?.((item: any) => item?.code === "sign_up_if_missing_transfer");
}

function getErrorMessage(error: unknown, labels: ReturnType<typeof t>) {
  const code = getClerkErrorCode(error);
  if (code === "form_identifier_not_found" || code === "identifier_not_found" || code === "resource_not_found") {
    return labels.authAccountNotFound;
  }
  if (code === "form_code_incorrect" || code === "verification_failed" || code === "form_param_format_invalid") {
    return labels.authInvalidCode;
  }
  if (code === "form_identifier_invalid" || code === "form_param_value_invalid") {
    return labels.authMissingPhone;
  }
  if (code === "session_exists" || code === "already_signed_in") {
    return labels.authAlreadySignedIn;
  }

  if (error instanceof Error && /already signed in/i.test(error.message)) return labels.authAlreadySignedIn;
  if (error instanceof Error && /couldn'?t find your account/i.test(error.message)) return labels.authAccountNotFound;
  if (error instanceof Error && error.message) return error.message;
  return labels.authGenericError;
}

function getClerkErrorCode(error: unknown) {
  const anyError = error as any;
  if (typeof anyError?.code === "string") return anyError.code;
  const nestedCode = anyError?.errors?.find?.((item: any) => typeof item?.code === "string")?.code;
  return typeof nestedCode === "string" ? nestedCode : "";
}

function LocaleToggle({
  locale,
  setLocale,
}: {
  locale: "es" | "en";
  setLocale: (locale: "es" | "en") => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div className="locale-toggle">
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
    </div>
  );
}
