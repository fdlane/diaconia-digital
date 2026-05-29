"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { localizeRouteError, t } from "./adminLabels";
import { CalendarIcon, ChevronRightIcon, DownloadIcon, FilterIcon, PlusIcon } from "./icons";
import { defaultSelectedMapZoom, parseMapZoom } from "./mapUrlState";
import type { AdminMeeting } from "./meetingTypes";

const MeetingsMap = dynamic(() => import("./MeetingsMap").then((m) => ({ default: m.MeetingsMap })), {
  ssr: false,
  loading: () => <div style={{ height: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map…</div>,
});

type Group = { id: string; name: string; community: string };

export function MeetingsList() {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedMeetingId = searchParams.get("meeting") ?? "";
  const selectedMapZoom = parseMapZoom(searchParams.get("zoom"));
  const viewMode = searchParams.get("view") === "map" ? "map" : "list";

  const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filters, setFilters] = useState({ from: "", to: "", groupId: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const hasLoadedGroupsRef = useRef(false);
  const loadedMeetingsKeyRef = useRef<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.groupId) params.set("groupId", filters.groupId);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    if (!isLoaded || !token || hasLoadedGroupsRef.current) return;
    hasLoadedGroupsRef.current = true;
    void loadGroups();
  }, [isLoaded, token]);

  useEffect(() => {
    if (!isLoaded || !token) return;
    const requestKey = query;
    if (loadedMeetingsKeyRef.current === requestKey) return;
    loadedMeetingsKeyRef.current = requestKey;
    void loadMeetings();
  }, [isLoaded, token, query]);

  async function loadGroups() {
    if (!token) return;
    const result = await apiFetch<{ groups: Group[] }>("/groups", token);
    if (result.ok) {
      setGroups(result.data.groups.filter((g) => g.name));
    }
  }

  async function loadMeetings() {
    if (!token) { setStatus("error"); setStatusMsg(l.authMissingSession); return; }
    setStatus("loading");
    setStatusMsg(l.loadingMeetings);

    const result = await apiFetch<{ meetings: AdminMeeting[]; warning?: string }>(
      `/meetings${query ? `?${query}` : ""}`,
      token,
    );

    if (!result.ok) {
      setStatus("error");
      setStatusMsg(localizeRouteError({ error: result.error }, l));
      return;
    }

    setMeetings(result.data.meetings);
    setStatus("done");
    setStatusMsg(result.data.warning ?? l.meetingsCount(result.data.meetings.length));
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

  const setRouteState = useCallback((next: { view?: "list" | "map"; meeting?: string | null; zoom?: number | null }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.view) {
      if (next.view === "map") {
        params.set("view", "map");
      } else {
        params.delete("view");
        params.delete("meeting");
        params.delete("zoom");
      }
    }

    if (next.meeting !== undefined) {
      if (next.meeting) {
        params.set("meeting", next.meeting);
        params.set("view", "map");
        params.set("zoom", String(next.zoom ?? selectedMapZoom ?? defaultSelectedMapZoom));
      } else {
        params.delete("meeting");
        params.delete("zoom");
      }
    }

    if (next.zoom !== undefined) {
      if (next.zoom) {
        params.set("zoom", String(next.zoom));
      } else {
        params.delete("zoom");
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [pathname, router, searchParams]);

  const setMapZoom = useCallback((zoom: number) => {
    if (selectedMapZoom === zoom) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "map");
    params.set("zoom", String(zoom));

    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams, selectedMapZoom]);

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
                onClick={() => setRouteState({ view: "list" })}
                style={{ borderRadius: 0, border: "none" }}
                type="button"
              >
                {l.listView}
              </button>
              <button
                className={`btn ${viewMode === "map" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setRouteState({ view: "map" })}
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
              <option value="">{l.allGroups}</option>
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
              height="max(28rem, calc(100dvh - var(--appbar-height) - 22rem))"
              locale={locale}
              meetings={meetings}
              onSelect={(id) => setRouteState({ meeting: id, zoom: selectedMapZoom ?? defaultSelectedMapZoom })}
              onZoomChange={setMapZoom}
              selectedMeetingId={selectedMeetingId}
              selectedZoom={selectedMapZoom}
              stewardLabel={l.loanSteward}
              unavailableLabel={l.mapUnavailable}
              viewDetailsLabel={l.viewMeetingDetail}
            />
            {meetings.filter((s) => s.latitude != null).length === 0 && status === "done" ? (
              <p className="text-sm text-muted" style={{ marginTop: "0.75rem", textAlign: "center" }}>
                {l.noActiveMeetingLocations}
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
                        <CalendarIcon size={40} />
                      </div>
                      <p className="empty-state-title">{l.noMeetings}</p>
                      <Link className="btn btn-primary" href="/meetings/new">
                        <PlusIcon size={14} />
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
