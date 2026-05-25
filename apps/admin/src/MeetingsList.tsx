"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { useAuth } from "./AuthContext";
import { localizeRouteError, t } from "./adminLabels";
import { ChevronRightIcon, DownloadIcon, FilterIcon, PlusIcon } from "./icons";

const MeetingsMap = dynamic(() => import("./MeetingsMap").then((m) => ({ default: m.MeetingsMap })), {
  ssr: false,
  loading: () => <div style={{ height: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map…</div>,
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Group = { id: string; name: string; community: string };

export type AdminMeeting = {
  id: string;
  heldAt: string;
  submittedAt: string | null;
  chaplainId: string | null;
  latitude: number | null;
  longitude: number | null;
  groupName: string;
  community: string;
  facilitatorName: string;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
  mediaCount?: number;
  prayerRequestCount?: number;
  openPrayerRequestCount?: number;
};

type MeetingMedia = { id: string; type: string; url: string };
type PrayerRequest = {
  id: string;
  request: string;
  status: string;
};

export function MeetingsList() {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filters, setFilters] = useState({ from: "", to: "", groupId: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const loadedGroupsTokenRef = useRef("");
  const loadedMeetingsKeyRef = useRef("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.groupId) params.set("groupId", filters.groupId);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    if (!isLoaded || !token || loadedGroupsTokenRef.current === token) return;
    loadedGroupsTokenRef.current = token;
    void loadGroups();
  }, [isLoaded, token]);

  useEffect(() => {
    if (!isLoaded || !token) return;
    const requestKey = `${token}:${query}`;
    if (loadedMeetingsKeyRef.current === requestKey) return;
    loadedMeetingsKeyRef.current = requestKey;
    void loadMeetings();
  }, [isLoaded, token, query]);

  async function loadGroups() {
    if (!token) return;
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    try {
      const res = await fetch(`${apiUrl}/groups`, { headers });
      if (!res.ok) return;
      const data = (await res.json()) as { groups: Group[] };
      setGroups(data.groups.filter((g) => g.name));
    } catch { /* non-critical */ }
  }

  async function loadMeetings() {
    if (!token) {
      setStatus("error");
      setStatusMsg(l.authMissingSession);
      return;
    }

    setStatus("loading");
    setStatusMsg(l.loadingMeetings);

    const headers: Record<string, string> = { authorization: `Bearer ${token}` };

    try {
      const res = await fetch(
        `${apiUrl}/meetings${query ? `?${query}` : ""}`,
        { headers },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          code?: string;
          error?: string;
          detail?: string;
        } | null;
        setStatus("error");
        setStatusMsg(payload?.detail ?? localizeRouteError(payload, l, res.status));
        return;
      }

      const data = (await res.json()) as {
        meetings: AdminMeeting[];
        warning?: string;
      };
      setMeetings(data.meetings);

      const base = data.warning ?? l.meetingsCount(data.meetings.length);
      setStatus("done");
      setStatusMsg(base);
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
    const rows = meetings.map((s) =>
      header
        .map((k) => {
          const v = String(s[k as keyof AdminMeeting] ?? "");
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
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              <button
                className={`btn ${viewMode === "list" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setViewMode("list")}
                style={{ borderRadius: 0, border: "none" }}
                type="button"
              >
                {l.listView}
              </button>
              <button
                className={`btn ${viewMode === "map" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setViewMode("map")}
                style={{ borderRadius: 0, border: "none", borderLeft: "1px solid var(--border)" }}
                type="button"
              >
                {l.mapView}
              </button>
            </div>
            <button className="btn btn-secondary" onClick={exportCsv} type="button">
              <DownloadIcon size={16} />
              {l.exportCsv}
            </button>
            <Link className="btn btn-primary" href="/meetings/new">
              <PlusIcon size={15} />
              {l.newMeeting}
            </Link>
          </div>
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
            <label htmlFor="group">{l.colGroup}</label>
            <select
              id="group"
              onChange={(e) => setFilters((v) => ({ ...v, groupId: e.target.value }))}
              value={filters.groupId}
            >
              <option value="">{locale === "es" ? "Todos los grupos" : "All groups"}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.community ? ` — ${g.community}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={() => void loadMeetings()}
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

        {viewMode === "map" ? (
          <div style={{ padding: "1rem" }}>
            <MeetingsMap
              onSelect={(id) => router.push(`/meetings/${id}`)}
              meetings={meetings}
            />
            {meetings.filter((s) => s.latitude != null).length === 0 && status === "done" ? (
              <p className="text-sm text-muted" style={{ marginTop: "0.75rem", textAlign: "center" }}>
                {locale === "es" ? "Ninguna reunión tiene ubicación registrada." : "No meetings have a location recorded."}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="table-wrapper" style={{ display: viewMode === "map" ? "none" : undefined }}>
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
                <th />
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr
                  className="row-link"
                  key={meeting.id}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                >
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDisplayDate(meeting.heldAt, locale)}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{meeting.groupName}</span>
                    {meeting.community ? (
                      <>
                        <br />
                        <span className="text-muted text-sm">{meeting.community}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{meeting.facilitatorName}</td>
                  <td>
                    {getFollowUpBadge(meeting.followUpCategory)}
                    {meeting.followUpNotes ? (
                      <p className="text-sm" style={{ marginTop: "0.35rem" }}>
                        {meeting.followUpNotes}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <span className="badge badge-default">{meeting.mediaCount ?? 0}</span>
                  </td>
                  <td>
                    {(meeting.prayerRequestCount ?? 0) > 0 ? (
                      <span className="badge badge-default">
                        {meeting.openPrayerRequestCount ?? 0}/{meeting.prayerRequestCount ?? 0}
                      </span>
                    ) : (
                      <span className="text-muted text-sm">{l.noRequests}</span>
                    )}
                  </td>
                  <td className="text-sm text-muted">
                    {meeting.notes || l.noNotes}
                  </td>
                  <td className="row-action-cell">
                    <ChevronRightIcon size={16} />
                  </td>
                </tr>
              ))}
              {!meetings.length && status !== "loading" ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg fill="none" height={40} stroke="currentColor" strokeLinecap="round"
                          strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24" width={40}>
                          <rect height="18" rx="2" width="18" x="3" y="4" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                      </div>
                      <p className="empty-state-title">{l.noMeetings}</p>
                      <Link className="btn btn-primary" href="/meetings/new">
                        <svg fill="none" height={14} stroke="currentColor" strokeLinecap="round"
                          strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={14}>
                          <line x1="12" x2="12" y1="5" y2="19" />
                          <line x1="5" x2="19" y1="12" y2="12" />
                        </svg>
                        {l.newMeeting}
                      </Link>
                    </div>
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
