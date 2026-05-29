"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon, EditIcon, TrashIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type MeetingDetail = {
  id: string;
  groupId: string;
  facilitatorId: string;
  chaplainId: string | null;
  chaplainName: string | null;
  heldAt: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  followUpCategory: string;
  followUpNotes: string;
  submittedAt: string | null;
  createdAt: string;
  groupName: string;
  community: string;
  facilitatorName: string;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  status: "present" | "absent" | "excused";
};

type PrayerRequest = {
  id: string;
  request: string;
  status: string;
  createdAt: string;
};

type MeetingMedia = { id: string; type: string; url: string };

function followUpColor(cat: string) {
  const map: Record<string, string> = {
    financial: "badge-warning",
    wellbeing: "badge-danger",
    training: "badge-default",
    documentation: "badge-default",
    other: "badge-muted",
  };
  return map[cat] ?? "badge-muted";
}

function statusBadge(status: string, l: ReturnType<typeof t>) {
  if (status === "present") return <span className="badge badge-success">{l.present}</span>;
  if (status === "absent") return <span className="badge badge-danger">{l.absent}</span>;
  return <span className="badge badge-muted">{l.excused}</span>;
}

function prayerStatusBadge(status: string) {
  if (status === "answered") return <span className="badge badge-success">{status}</span>;
  if (status === "archived") return <span className="badge badge-muted">{status}</span>;
  return <span className="badge badge-default">{status}</span>;
}

export function MeetingDetailPage({ id }: { id: string }) {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [media, setMedia] = useState<MeetingMedia[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !token) return;
    if (loadedIdRef.current === id) return;
    loadedIdRef.current = id;
    void load();
  }, [id, isLoaded, token]);

  async function load() {
    if (!token) return;
    setStatus("loading");
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    try {
      const [detailRes, mediaRes] = await Promise.all([
        fetch(`${apiUrl}/meetings/${id}`, { headers }),
        fetch(`${apiUrl}/meetings/${id}/media`, { headers }),
      ]);

      if (!detailRes.ok) {
        const payload = (await detailRes.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${detailRes.status}`);
        setStatus("error");
        return;
      }

      const data = (await detailRes.json()) as {
        meeting: MeetingDetail;
        attendance: AttendanceRecord[];
        prayerRequests: PrayerRequest[];
      };

      setMeeting(data.meeting);
      setAttendance(data.attendance);
      setPrayers(data.prayerRequests);

      if (mediaRes.ok) {
        const mediaData = (await mediaRes.json()) as { media: MeetingMedia[] };
        setMedia(mediaData.media);
      }

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setStatus("error");
    }
  }

  async function handleDelete() {
    if (!token) {
      setErrorMsg(l.authMissingSession);
      return;
    }
    setDeleteState("deleting");
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    try {
      const res = await fetch(`${apiUrl}/meetings/${id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setDeleteState("idle");
        return;
      }
      router.push("/meetings");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setDeleteState("idle");
    }
  }

  if (status === "loading") {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/meetings">{l.meetings}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{l.loading}</span>
        </nav>
        <div className="status-bar">
          <span className="loading-dot" />
          <span>{l.loading}</span>
        </div>
      </div>
    );
  }

  if (status === "error" || !meeting) {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/meetings">{l.meetings}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Error</span>
        </nav>
        <div className="banner banner-error">{errorMsg || "Not found"}</div>
        <Link className="btn btn-ghost" href="/meetings">
          <ArrowLeftIcon size={15} />
          {l.backToMeetings}
        </Link>
      </div>
    );
  }

  const title = `${meeting.groupName} · ${formatDisplayDate(meeting.heldAt, locale)}`;

  return (
    <div>
      <nav className="breadcrumb">
        <Link href="/meetings">{l.meetings}</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{title}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{meeting.groupName}</h1>
          <p className="page-subtitle">{formatDisplayDate(meeting.heldAt, locale)}</p>
        </div>
        <div className="page-header-actions">
          {deleteState === "confirming" ? (
            <div className="inline-confirm">
              <span className="inline-confirm-msg">{l.confirmDeleteTitle}</span>
              <button
                className="btn-link"
                onClick={() => setDeleteState("idle")}
                type="button"
              >
                {l.cancel}
              </button>
              <button className="btn btn-danger" onClick={handleDelete} type="button">
                {l.deleteBtn}
              </button>
            </div>
          ) : (
            <>
              <Link className="btn btn-secondary" href={`/meetings/${id}/edit`}>
                <EditIcon size={15} />
                {l.editMeeting}
              </Link>
              <button
                className="btn btn-danger"
                disabled={deleteState === "deleting"}
                onClick={() => setDeleteState("confirming")}
                type="button"
              >
                <TrashIcon size={15} />
                {deleteState === "deleting" ? l.deleting : l.deleteMeeting}
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error">{errorMsg}</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Overview */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{l.overview}</span>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">{l.colGroup}</span>
                <span className="detail-value">{meeting.groupName}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colCommunity}</span>
                <span className="detail-value">{meeting.community}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colFacilitator}</span>
                <span className="detail-value">{meeting.facilitatorName}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colDate}</span>
                <span className="detail-value">{formatDisplayDate(meeting.heldAt, locale)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.chaplainAttended}</span>
                <span className="detail-value">
                  {meeting.chaplainName ? meeting.chaplainName : (
                    <span className="text-muted">{l.noChaplainAttended}</span>
                  )}
                </span>
              </div>
              {meeting.latitude != null && meeting.longitude != null ? (
                <div className="detail-field">
                  <span className="detail-label">{l.locationPin}</span>
                  <span className="detail-value">
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {meeting.latitude.toFixed(6)}, {meeting.longitude.toFixed(6)}
                    </span>
                    <br />
                    <Link
                      href={`/meetings?view=map&meeting=${encodeURIComponent(meeting.id)}&zoom=19`}
                      style={{ color: "var(--brand)", fontSize: "0.875rem" }}
                    >
                      {l.viewOnMap}
                    </Link>
                  </span>
                </div>
              ) : null}
              {meeting.submittedAt ? (
                <div className="detail-field">
                  <span className="detail-label">{l.submittedAt}</span>
                  <span className="detail-value">{formatDisplayDate(meeting.submittedAt, locale)}</span>
                </div>
              ) : null}
              {meeting.notes ? (
                <div className="detail-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">{l.colNotes}</span>
                  <span className="detail-value"
                    style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {meeting.notes}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Follow-up */}
        {meeting.followUpCategory && meeting.followUpCategory !== "none" ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{l.colFollowUp}</span>
              <span className={`badge ${followUpColor(meeting.followUpCategory)}`}>
                {meeting.followUpCategory}
              </span>
            </div>
            {meeting.followUpNotes ? (
              <div className="card-body">
                <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, color: "var(--ink-2)" }}>
                  {meeting.followUpNotes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Attendance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{l.attendance}</span>
            {attendance.length > 0 ? (
              <span className="text-sm text-muted">{attendance.length} {locale === "es" ? "personas" : "people"}</span>
            ) : null}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{l.colName}</th>
                  <th>{l.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td>{a.userName}</td>
                    <td>{statusBadge(a.status, l)}</td>
                  </tr>
                ))}
                {!attendance.length ? (
                  <tr>
                    <td className="table-empty" colSpan={2}>{l.noAttendance}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prayer Requests */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{l.prayerRequests}</span>
            {prayers.length > 0 ? (
              <span className="text-sm text-muted">{prayers.length} requests</span>
            ) : null}
          </div>
          {prayers.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{locale === "es" ? "Petición" : "Request"}</th>
                    <th>{l.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {prayers.map((pr) => (
                    <tr key={pr.id}>
                      <td style={{ lineHeight: 1.5 }}>{pr.request}</td>
                      <td>{prayerStatusBadge(pr.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-body">
              <p className="text-sm text-muted">{l.noPrayerRequests}</p>
            </div>
          )}
        </div>

        {/* Photos */}
        {media.length > 0 ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{l.photos}</span>
              <span className="text-sm text-muted">{media.length} photos</span>
            </div>
            <div className="card-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {media.map((m) => (
                  <a href={m.url} key={m.id} rel="noreferrer" target="_blank">
                    <img
                      alt={l.meetingPhoto}
                      src={m.url}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        objectFit: "cover",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        display: "block",
                      }}
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
