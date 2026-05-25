"use client";

import { formatDisplayDate, getProfileInitials, labels, type SupportedLocale } from "@diaconia/shared";
import { useEffect, useMemo, useState } from "react";

type AdminMeeting = {
  id: string;
  heldAt: string;
  submittedAt: string | null;
  groupName: string;
  community: string;
  facilitatorName: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
};

type MeetingMedia = {
  id: string;
  type: string;
  url: string;
};

type PrayerRequest = {
  id: string;
  request: string;
  status: string;
  createdAt: string;
};

type AdminMeetingsResponse = {
  meetings: AdminMeeting[];
  warning?: string;
};

type CurrentUserProfile = {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const localeStorageKey = "diaconia:admin:locale";
const profileStorageKey = "diaconia:admin:profile";
const tokenStorageKey = "diaconia:admin:accessToken";
const defaultProfile: CurrentUserProfile = {
  displayName: "Diaconia Admin",
  email: "admin@diaconia.local",
  phone: "+595 21 000 100",
  avatarUrl: "",
};
const localeOptions = [
  { locale: "es", label: "ES" },
  { locale: "en", label: "EN" },
] as const;

export function AdminDashboard() {
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
  const [mediaByMeeting, setMediaByMeeting] = useState<Record<string, MeetingMedia[]>>({});
  const [prayerRequestsByMeeting, setPrayerRequestsByMeeting] = useState<
    Record<string, PrayerRequest[]>
  >({});
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<CurrentUserProfile>(defaultProfile);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [filters, setFilters] = useState({
    facilitatorId: "",
    groupId: "",
    from: "",
    to: "",
  });
  const copy = labels[locale];
  const [status, setStatus] = useState(copy.ready);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return params.toString();
  }, [filters]);

  async function loadMeetings(tokenOverride = token) {
    setStatus(copy.loadingMeetings);
    const requestInit = tokenOverride
      ? {
          headers: {
            authorization: `Bearer ${tokenOverride}`,
          },
        }
      : undefined;

    try {
      const response = await fetch(`${apiUrl}/meetings${query ? `?${query}` : ""}`, requestInit);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; detail?: string }
          | null;
        setStatus(payload?.detail ?? payload?.error ?? `Error ${response.status}`);
        return;
      }

      const payload = (await response.json()) as AdminMeetingsResponse;
      setMeetings(payload.meetings);
      setMediaByMeeting({});
      setPrayerRequestsByMeeting({});
      let detailFailures = 0;
      const mediaEntries = await Promise.all(
        payload.meetings.map(async (meeting) => {
          try {
            const mediaResponse = await fetch(`${apiUrl}/meetings/${meeting.id}/media`, requestInit);

            if (!mediaResponse.ok) {
              detailFailures += 1;
              return [meeting.id, []] as const;
            }

            const mediaPayload = (await mediaResponse.json()) as { media: MeetingMedia[] };
            return [meeting.id, mediaPayload.media] as const;
          } catch {
            detailFailures += 1;
            return [meeting.id, []] as const;
          }
        }),
      );
      const prayerEntries = await Promise.all(
        payload.meetings.map(async (meeting) => {
          try {
            const prayerResponse = await fetch(
              `${apiUrl}/meetings/${meeting.id}/prayer-requests`,
              requestInit,
            );

            if (!prayerResponse.ok) {
              detailFailures += 1;
              return [meeting.id, []] as const;
            }

            const prayerPayload = (await prayerResponse.json()) as { prayerRequests: PrayerRequest[] };
            return [meeting.id, prayerPayload.prayerRequests] as const;
          } catch {
            detailFailures += 1;
            return [meeting.id, []] as const;
          }
        }),
      );
      setMediaByMeeting(Object.fromEntries(mediaEntries));
      setPrayerRequestsByMeeting(Object.fromEntries(prayerEntries));
      const baseStatus = payload.warning ?? `${payload.meetings.length} ${copy.meetings}`;
      setStatus(detailFailures ? `${baseStatus} · ${detailFailures} detail loads failed` : baseStatus);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Error ${copy.loadingMeetings}`);
    }
  }

  function updateLocale(nextLocale: SupportedLocale) {
    setLocale(nextLocale);
    setStatus(labels[nextLocale].ready);
    window.localStorage.setItem(localeStorageKey, nextLocale);
  }

  function saveProfile() {
    const nextProfile = {
      ...profileDraft,
      displayName: profileDraft.displayName.trim() || defaultProfile.displayName,
      email: profileDraft.email.trim(),
      phone: profileDraft.phone.trim(),
      avatarUrl: profileDraft.avatarUrl.trim(),
    };
    setCurrentUser(nextProfile);
    setProfileDraft(nextProfile);
    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));
    window.localStorage.setItem(tokenStorageKey, token);
    setProfileEditorOpen(false);
    setProfileMenuOpen(false);
  }

  function signInWithToken() {
    setCurrentUser(profileDraft);
    window.localStorage.setItem(profileStorageKey, JSON.stringify(profileDraft));
    window.localStorage.setItem(tokenStorageKey, token);
    void loadMeetings(token);
  }

  function signOut() {
    setCurrentUser(null);
    setToken("");
    setMeetings([]);
    setMediaByMeeting({});
    setPrayerRequestsByMeeting({});
    setProfileMenuOpen(false);
    setProfileEditorOpen(false);
    window.localStorage.removeItem(tokenStorageKey);
    window.localStorage.removeItem(profileStorageKey);
    setStatus(locale === "es" ? "Sesión cerrada" : "Signed out");
  }

  function exportCsv() {
    const header = [
      "heldAt",
      "groupName",
      "community",
      "facilitatorName",
      "followUpCategory",
      "notes",
      "followUpNotes",
    ];
    const rows = meetings.map((meeting) =>
      header
        .map((key) => {
          const value = String(meeting[key as keyof AdminMeeting] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diaconia-meetings.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);
    if (storedLocale === "es" || storedLocale === "en") {
      setLocale(storedLocale);
      setStatus(labels[storedLocale].ready);
    }
    const storedToken = window.localStorage.getItem(tokenStorageKey) ?? "";
    setToken(storedToken);
    const storedProfile = window.localStorage.getItem(profileStorageKey);
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as CurrentUserProfile;
        setCurrentUser(parsed);
        setProfileDraft(parsed);
      } catch {
        setCurrentUser(null);
      }
    }
    void loadMeetings(storedToken);
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <img alt="Diaconia" className="brand-logo" src="/logo.png" />
          <div>
            <span>{copy.adminSubtitle}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="language-switch" aria-label="Language">
            {localeOptions.map((option) => (
              <button
                aria-pressed={locale === option.locale}
                className={locale === option.locale ? "active" : ""}
                key={option.locale}
                onClick={() => updateLocale(option.locale)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="secondary" onClick={exportCsv} type="button">
            {copy.exportCsv}
          </button>
          {currentUser ? (
            <div className="profile-anchor">
              <button
                aria-expanded={profileMenuOpen}
                aria-label={locale === "es" ? "Abrir perfil" : "Open profile"}
                className="avatar-menu-button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                type="button"
              >
                {currentUser.avatarUrl ? (
                  <img alt="" src={currentUser.avatarUrl} />
                ) : (
                  <span>{getProfileInitials(currentUser.displayName, currentUser.email)}</span>
                )}
              </button>
              {profileMenuOpen ? (
                <div className="profile-menu">
                  <span className="eyebrow">{locale === "es" ? "Mi perfil" : "My profile"}</span>
                  <strong>{currentUser.displayName}</strong>
                  <span>{currentUser.email || currentUser.phone || "Admin demo"}</span>
                  <button className="secondary" onClick={() => setProfileEditorOpen(true)} type="button">
                    {locale === "es" ? "Editar perfil" : "Edit profile"}
                  </button>
                  <button className="danger" onClick={signOut} type="button">
                    {locale === "es" ? "Salir" : "Sign out"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <section className="content">
        {!currentUser ? (
          <div className="signin-panel">
            <h1>{locale === "es" ? "Ingresar" : "Sign in"}</h1>
            <p className="muted">
              {locale === "es"
                ? "Use un token de acceso cuando el proveedor de identidad esté configurado; localmente puede continuar como admin demo."
                : "Use an access token once the identity provider is configured; locally you can continue as a demo admin."}
            </p>
            <input
              aria-label={copy.accessToken}
              onChange={(event) => setToken(event.target.value)}
              placeholder={copy.tokenPlaceholder}
              value={token}
            />
            <button onClick={signInWithToken} type="button">{copy.signIn}</button>
          </div>
        ) : null}
        <div className="toolbar" aria-label={copy.filters}>
          <div className="field">
            <label htmlFor="token">{copy.accessToken}</label>
            <input
              id="token"
              onChange={(event) => setToken(event.target.value)}
              onBlur={() => window.localStorage.setItem(tokenStorageKey, token)}
              placeholder={copy.tokenPlaceholder}
              value={token}
            />
          </div>
          <div className="field">
            <label htmlFor="from">{copy.from}</label>
            <input
              id="from"
              onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))}
              type="date"
              value={filters.from}
            />
          </div>
          <div className="field">
            <label htmlFor="to">{copy.to}</label>
            <input
              id="to"
              onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))}
              type="date"
              value={filters.to}
            />
          </div>
          <div className="field">
            <label htmlFor="group">{copy.group}</label>
            <input
              id="group"
              onChange={(event) =>
                setFilters((value) => ({ ...value, groupId: event.target.value }))
              }
              placeholder="UUID"
              value={filters.groupId}
            />
          </div>
          <button onClick={() => void loadMeetings()} type="button">
            {copy.filter}
          </button>
        </div>

        <p className="muted">{status}</p>

        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>{copy.date}</th>
                <th>{copy.group}</th>
                <th>{copy.facilitator}</th>
                <th>{copy.followUp}</th>
                <th>{copy.photos}</th>
                <th>{locale === "es" ? "Oración" : "Prayer"}</th>
                <th>{copy.notes}</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td>{formatDisplayDate(meeting.heldAt, locale)}</td>
                  <td>
                    <strong>{meeting.groupName}</strong>
                    <br />
                    <span className="muted">{meeting.community}</span>
                  </td>
                  <td>{meeting.facilitatorName}</td>
                  <td>
                    <span className="badge">{meeting.followUpCategory}</span>
                    {meeting.followUpNotes ? <p>{meeting.followUpNotes}</p> : null}
                  </td>
                  <td>
                    <div className="thumbs">
                      {(mediaByMeeting[meeting.id] ?? []).map((media) => (
                        <img alt={copy.meetingPhotoAlt} key={media.id} src={media.url} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="prayer-list">
                      {(prayerRequestsByMeeting[meeting.id] ?? []).map((request) => (
                        <article className="prayer-card" key={request.id}>
                          <p>{request.request}</p>
                          <span>{request.status}</span>
                        </article>
                      ))}
                      {!(prayerRequestsByMeeting[meeting.id] ?? []).length ? (
                        <span className="muted">{locale === "es" ? "Sin peticiones" : "No requests"}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{meeting.notes || copy.noNotes}</td>
                </tr>
              ))}
              {!meetings.length ? (
                <tr>
                  <td colSpan={7}>{copy.noMeetings}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
              {profileEditorOpen ? (
          <div className="modal-backdrop" role="presentation">
            <div aria-label={locale === "es" ? "Editar perfil" : "Edit profile"} className="profile-editor" role="dialog">
              <h2>{locale === "es" ? "Editar perfil" : "Edit profile"}</h2>
              <label>
                {locale === "es" ? "Nombre" : "Name"}
                <input
                  onChange={(event) => setProfileDraft((value) => ({ ...value, displayName: event.target.value }))}
                  value={profileDraft.displayName}
                />
              </label>
              <label>
                {locale === "es" ? "Correo" : "Email"}
                <input
                  onChange={(event) => setProfileDraft((value) => ({ ...value, email: event.target.value }))}
                  value={profileDraft.email}
                />
              </label>
              <label>
                {locale === "es" ? "Teléfono" : "Phone"}
                <input
                  onChange={(event) => setProfileDraft((value) => ({ ...value, phone: event.target.value }))}
                  value={profileDraft.phone}
                />
              </label>
              <label>
                {locale === "es" ? "URL de avatar" : "Avatar URL"}
                <input
                  onChange={(event) => setProfileDraft((value) => ({ ...value, avatarUrl: event.target.value }))}
                  value={profileDraft.avatarUrl}
                />
              </label>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setProfileEditorOpen(false)} type="button">
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button onClick={saveProfile} type="button">
                  {locale === "es" ? "Guardar perfil" : "Save profile"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
