"use client";

import { useAuth } from "./AuthContext";
import { SettingsIcon } from "./icons";

export function SettingsPage() {
  const { locale, setLocale } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Application preferences and configuration</p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <span className="card-title">Preferences</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>Language</div>
              <div className="text-sm text-muted" style={{ marginTop: "0.2rem" }}>
                Choose the display language for dates and labels
              </div>
            </div>
            <div className="locale-toggle">
              <button
                className={locale === "es" ? "locale-btn active" : "locale-btn"}
                onClick={() => setLocale("es")}
                type="button"
              >
                Español
              </button>
              <button
                className={locale === "en" ? "locale-btn active" : "locale-btn"}
                onClick={() => setLocale("en")}
                type="button"
              >
                English
              </button>
            </div>
          </div>

          <div className="context-menu-divider" />

          <div>
            <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>API Endpoint</div>
            <div className="text-sm text-muted" style={{ marginTop: "0.2rem" }}>
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000 (default)"}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <div className="card-header">
          <span className="card-title">Advanced</span>
        </div>
        <div className="card-body">
          <div className="placeholder-page" style={{ minHeight: 160 }}>
            <div className="placeholder-icon">
              <SettingsIcon size={40} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--ink-2)" }}>More settings coming soon</p>
              <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                Group management, notifications, and user roles will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
