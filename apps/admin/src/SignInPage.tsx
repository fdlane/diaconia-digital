"use client";

import { useState } from "react";
import { defaultProfile, useAuth, type CurrentUserProfile } from "./AuthContext";

export function SignInPage() {
  const { signIn } = useAuth();
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
        setError("Invalid token. Please check your Cognito ID token and try again.");
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
          <p>
            Paste a Cognito ID token, or continue without one in local dev.
          </p>
        </div>
        <div className="signin-form">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <div className="form-field">
            <label htmlFor="token">Cognito ID Token</label>
            <input
              autoComplete="off"
              id="token"
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSignIn();
              }}
              placeholder="Paste bearer token (optional for local dev)"
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
