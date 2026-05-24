"use client";

import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { SettingsIcon } from "./icons";

export function SettingsPage() {
  const { locale, setLocale } = useAuth();
  const l = t(locale);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{l.settings}</h1>
        <p className="page-subtitle">{l.settingsSubtitle}</p>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <span className="card-title">{l.preferences}</span>
        </div>
        <div
          className="card-body"
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>
                {l.language}
              </div>
              <div className="text-sm text-muted" style={{ marginTop: "0.2rem" }}>
                {l.languageDesc}
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
            <div className="font-semibold" style={{ fontSize: "0.9375rem" }}>
              {l.apiEndpoint}
            </div>
            <div className="text-sm text-muted" style={{ marginTop: "0.2rem" }}>
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <div className="card-header">
          <span className="card-title">{l.advanced}</span>
        </div>
        <div className="card-body">
          <div className="placeholder-page" style={{ minHeight: 160 }}>
            <div className="placeholder-icon">
              <SettingsIcon size={40} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--ink-2)" }}>
                {l.moreSettingsSoon}
              </p>
              <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                {l.moreSettingsDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
