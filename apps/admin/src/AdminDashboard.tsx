"use client";

import { formatDisplayDate, labels, type SupportedLocale } from "@diaconia/shared";
import { useEffect, useMemo, useState } from "react";

type AdminSession = {
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

type SessionMedia = {
  id: string;
  type: string;
  url: string;
};

type PrayerRequest = {
  id: string;
  attendeeId: string | null;
  requesterName: string;
  request: string;
  status: string;
  createdAt: string;
};

type AdminSessionsResponse = {
  sessions: AdminSession[];
  warning?: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const localeStorageKey = "diaconia:admin:locale";
const localeOptions = [
  { locale: "es", label: "ES" },
  { locale: "en", label: "EN" },
] as const;

export function AdminDashboard() {
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [mediaBySession, setMediaBySession] = useState<Record<string, SessionMedia[]>>({});
  const [prayerRequestsBySession, setPrayerRequestsBySession] = useState<
    Record<string, PrayerRequest[]>
  >({});
  const [token, setToken] = useState("");
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

  async function loadSessions() {
    setStatus(copy.loadingSessions);
    const requestInit = token
      ? {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      : undefined;
    const response = await fetch(`${apiUrl}/admin/sessions${query ? `?${query}` : ""}`, requestInit);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; detail?: string }
        | null;
      setStatus(payload?.detail ?? payload?.error ?? `Error ${response.status}`);
      return;
    }

    const payload = (await response.json()) as AdminSessionsResponse;
    setSessions(payload.sessions);
    const mediaEntries = await Promise.all(
      payload.sessions.slice(0, 20).map(async (session) => {
        const mediaResponse = await fetch(`${apiUrl}/admin/sessions/${session.id}/media`, requestInit);

        if (!mediaResponse.ok) {
          return [session.id, []] as const;
        }

        const mediaPayload = (await mediaResponse.json()) as { media: SessionMedia[] };
        return [session.id, mediaPayload.media] as const;
      }),
    );
    const prayerEntries = await Promise.all(
      payload.sessions.slice(0, 20).map(async (session) => {
        const prayerResponse = await fetch(
          `${apiUrl}/admin/sessions/${session.id}/prayer-requests`,
          requestInit,
        );

        if (!prayerResponse.ok) {
          return [session.id, []] as const;
        }

        const prayerPayload = (await prayerResponse.json()) as { prayerRequests: PrayerRequest[] };
        return [session.id, prayerPayload.prayerRequests] as const;
      }),
    );
    setMediaBySession(Object.fromEntries(mediaEntries));
    setPrayerRequestsBySession(Object.fromEntries(prayerEntries));
    setStatus(payload.warning ?? `${payload.sessions.length} ${copy.sessions}`);
  }

  function updateLocale(nextLocale: SupportedLocale) {
    setLocale(nextLocale);
    setStatus(labels[nextLocale].ready);
    window.localStorage.setItem(localeStorageKey, nextLocale);
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
    const rows = sessions.map((session) =>
      header
        .map((key) => {
          const value = String(session[key as keyof AdminSession] ?? "");
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
    link.download = "diaconia-sessions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);
    if (storedLocale === "es" || storedLocale === "en") {
      setLocale(storedLocale);
      setStatus(labels[storedLocale].ready);
    }
    void loadSessions();
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
        </div>
      </header>

      <section className="content">
        <div className="toolbar" aria-label={copy.filters}>
          <div className="field">
            <label htmlFor="token">{copy.cognitoToken}</label>
            <input
              id="token"
              onChange={(event) => setToken(event.target.value)}
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
          <button onClick={loadSessions} type="button">
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
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{formatDisplayDate(session.heldAt, locale)}</td>
                  <td>
                    <strong>{session.groupName}</strong>
                    <br />
                    <span className="muted">{session.community}</span>
                  </td>
                  <td>{session.facilitatorName}</td>
                  <td>
                    <span className="badge">{session.followUpCategory}</span>
                    {session.followUpNotes ? <p>{session.followUpNotes}</p> : null}
                  </td>
                  <td>
                    <div className="thumbs">
                      {(mediaBySession[session.id] ?? []).map((media) => (
                        <img alt={copy.meetingPhotoAlt} key={media.id} src={media.url} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="prayer-list">
                      {(prayerRequestsBySession[session.id] ?? []).map((request) => (
                        <article className="prayer-card" key={request.id}>
                          <strong>{request.requesterName}</strong>
                          <p>{request.request}</p>
                          <span>{request.status}</span>
                        </article>
                      ))}
                      {!(prayerRequestsBySession[session.id] ?? []).length ? (
                        <span className="muted">{locale === "es" ? "Sin peticiones" : "No requests"}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{session.notes || copy.noNotes}</td>
                </tr>
              ))}
              {!sessions.length ? (
                <tr>
                  <td colSpan={7}>{copy.noSessions}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
