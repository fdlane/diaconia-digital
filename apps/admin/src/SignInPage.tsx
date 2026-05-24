"use client";

import { useState } from "react";
import { defaultProfile, useAuth, type CurrentUserProfile } from "./AuthContext";
import { t } from "./adminLabels";

export function SignInPage() {
  const { signIn, locale, setLocale } = useAuth();
  const l = t(locale);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setLoading(true);
    setError("");

    const profile: CurrentUserProfile = { ...defaultProfile };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiUrl}/admin/sessions?limit=1`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok && res.status === 401) {
        setError(l.invalidToken);
        setLoading(false);
        return;
      }

      signIn(token, profile);
    } catch {
      signIn(token, profile);
    }

    setLoading(false);
  }

  return (
    <div className="signin-page">
      <div className="signin-card">
        <div className="signin-logo">
          <img alt="Diaconia" src="/logo.png" />
        </div>
        <div className="signin-heading">
          <h1>Diaconia Admin</h1>
          <p>{l.signInSubtitle}</p>
        </div>
        <div className="signin-form">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <div className="form-field">
            <label htmlFor="token">{l.cognitoTokenLabel}</label>
            <input
              autoComplete="off"
              id="token"
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSignIn();
              }}
              placeholder={l.cognitoTokenPlaceholder}
              type="password"
              value={token}
            />
          </div>
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => void handleSignIn()}
            style={{ width: "100%", height: "2.75rem", fontSize: "0.9375rem" }}
            type="button"
          >
            {loading ? l.signingIn : l.signIn}
          </button>
        </div>
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
      </div>
    </div>
  );
}
