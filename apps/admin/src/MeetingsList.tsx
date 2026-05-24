"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { DownloadIcon, FilterIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

type SessionMedia = { id: string; type: string; url: string };
type PrayerRequest = {
  id: string;
  requesterName: string;
  request: string;
  status: string;
};

export function MeetingsList() {
  const { token, locale } = useAuth();
  const l = t(locale);

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [mediaBySession, setMediaBySession] = useState<Record<string, SessionMedia[]>>({});
  const [prayersBySession, setPrayersBySession] = useState<
    Record<string, PrayerRequest[]>
  >({});
  const [filters, setFilters] = useState({ from: "", to: "", groupId: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.groupId) params.set("groupId", filters.groupId);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    void loadSessions();
  }, [token]);

  async function loadSessions() {
    setStatus("loading");
    setStatusMsg(l.loadingSessions);

    const headers: Record<string, string> = token
      ? { authorization: `Bearer ${token}` }
      : {};

    try {
      const res = await fetch(
        `${apiUrl}/admin/sessions${query ? `?${query}` : ""}`,
        { headers },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          detail?: string;
        } | null;
        setStatus("error");
        setStatusMsg(payload?.detail ?? payload?.error ?? `Error ${res.status}`);
        return;
      }

      const data = (await res.json()) as {
        sessions: AdminSession[];
        warning?: string;
      };
      setSessions(data.sessions);
      setMediaBySession({});
      setPrayersBySession({});

      let failures = 0;

      const [mediaEntries, prayerEntries] = await Promise.all([
        Promise.all(
          data.sessions.map(async (s) => {
            try {
              const r = await fetch(`${apiUrl}/admin/sessions/${s.id}/media`, { headers });
              if (!r.ok) { failures++; return [s.id, []] as const; }
              const p = (await r.json()) as { media: SessionMedia[] };
              return [s.id, p.media] as const;
            } catch { failures++; return [s.id, []] as const; }
          }),
        ),
        Promise.all(
          data.sessions.map(async (s) => {
            try {
              const r = await fetch(
                `${apiUrl}/admin/sessions/${s.id}/prayer-requests`,
                { headers },
              );
              if (!r.ok) { failures++; return [s.id, []] as const; }
              const p = (await r.json()) as { prayerRequests: PrayerRequest[] };
              return [s.id, p.prayerRequests] as const;
            } catch { failures++; return [s.id, []] as const; }
          }),
        ),
      ]);

      setMediaBySession(Object.fromEntries(mediaEntries));
      setPrayersBySession(Object.fromEntries(prayerEntries));

      const base = data.warning ?? l.sessions(data.sessions.length);
      setStatus("done");
      setStatusMsg(failures ? `${base} · ${failures} detail loads failed` : base);
    } catch (err) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Error");
    }
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
    const rows = sessions.map((s) =>
      header
        .map((k) => {
          const v = String(s[k as keyof AdminSession] ?? "");
          return `"${v.replaceAll('"', '""')}"`;
        })
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diaconia-reuniones.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function getFollowUpBadge(category: string) {
    if (!category || category === "none") return null;
    const colors: Record<string, string> = {
      financial: "badge-warning",
      wellbeing: "badge-danger",
      training: "badge-default",
      documentation: "badge-default",
      other: "badge-muted",
    };
    return (
      <span className={`badge ${colors[category] ?? "badge-muted"}`}>
        {category}
      </span>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 className="page-title">{l.meetings}</h1>
            <p className="page-subtitle">{l.meetingsSubtitle}</p>
          </div>
          <button className="btn btn-secondary" onClick={exportCsv} type="button">
            <DownloadIcon size={16} />
            {l.exportCsv}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="form-field">
            <label htmlFor="from">{l.from}</label>
            <input
              id="from"
              onChange={(e) => setFilters((v) => ({ ...v, from: e.target.value }))}
              type="date"
              value={filters.from}
            />
          </div>
          <div className="form-field">
            <label htmlFor="to">{l.to}</label>
            <input
              id="to"
              onChange={(e) => setFilters((v) => ({ ...v, to: e.target.value }))}
              type="date"
              value={filters.to}
            />
          </div>
          <div className="form-field">
            <label htmlFor="group">{l.groupId}</label>
            <input
              id="group"
              onChange={(e) => setFilters((v) => ({ ...v, groupId: e.target.value }))}
              placeholder="UUID"
              value={filters.groupId}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={() => void loadSessions()}
              type="button"
            >
              <FilterIcon size={15} />
              {l.filter}
            </button>
          </div>
        </div>

        <div className="status-bar">
          {status === "loading" ? <span className="loading-dot" /> : null}
          <span>{statusMsg}</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{l.colDate}</th>
                <th>{l.colGroup}</th>
                <th>{l.colFacilitator}</th>
                <th>{l.colFollowUp}</th>
                <th>{l.colPhotos}</th>
                <th>{l.colPrayer}</th>
                <th>{l.colNotes}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDisplayDate(session.heldAt, locale)}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{session.groupName}</span>
                    {session.community ? (
                      <>
                        <br />
                        <span className="text-muted text-sm">{session.community}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{session.facilitatorName}</td>
                  <td>
                    {getFollowUpBadge(session.followUpCategory)}
                    {session.followUpNotes ? (
                      <p className="text-sm" style={{ marginTop: "0.35rem" }}>
                        {session.followUpNotes}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <div className="thumbs">
                      {(mediaBySession[session.id] ?? []).map((m) => (
                        <img alt={l.meetingPhoto} key={m.id} src={m.url} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="prayer-list">
                      {(prayersBySession[session.id] ?? []).map((pr) => (
                        <div className="prayer-card" key={pr.id}>
                          <strong>{pr.requesterName}</strong>
                          <p>{pr.request}</p>
                          <span className="prayer-status">{pr.status}</span>
                        </div>
                      ))}
                      {!(prayersBySession[session.id] ?? []).length ? (
                        <span className="text-muted text-sm">{l.noRequests}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-sm text-muted">
                    {session.notes || l.noNotes}
                  </td>
                </tr>
              ))}
              {!sessions.length && status !== "loading" ? (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    {l.noSessions}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
