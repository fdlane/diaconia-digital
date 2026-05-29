"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon, EditIcon, TrashIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type UserDetail = {
  id: string;
  authSubject: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "facilitator" | "chaplain" | "member";
  createdAt: string;
  updatedAt: string;
};

type GroupRow = {
  id: string;
  name: string;
  community: string;
  active: boolean;
};

export function MemberDetailPage({ id }: { id: string }) {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [meetingCount, setMeetingCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");
  const loadedIdRef = useRef<string | null>(null);

  function roleLabel(role: UserDetail["role"]) {
    if (role === "admin") return l.roleAdmin;
    if (role === "chaplain") return l.chaplain;
    if (role === "member") return l.rolePerson;
    return l.roleFacilitator;
  }

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
      const res = await fetch(`${apiUrl}/users/${id}`, { headers });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setStatus("error");
        return;
      }
      const data = (await res.json()) as { user: UserDetail; groups: GroupRow[]; meetingCount: number };
      setUser(data.user);
      setGroups(data.groups);
      setMeetingCount(data.meetingCount);
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
      const res = await fetch(`${apiUrl}/users/${id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setDeleteState("idle");
        return;
      }
      router.push("/people");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setDeleteState("idle");
    }
  }

  if (status === "loading") {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/people">{l.members}</Link>
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

  if (status === "error" || !user) {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/people">{l.members}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Error</span>
        </nav>
        <div className="banner banner-error">{errorMsg || "Not found"}</div>
        <Link className="btn btn-ghost" href="/people">
          <ArrowLeftIcon size={15} />
          {l.backToMembers}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="breadcrumb">
        <Link href="/people">{l.members}</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{user.displayName}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{user.displayName}</h1>
          <p className="page-subtitle">
            {roleLabel(user.role)}
          </p>
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
              <Link className="btn btn-secondary" href={`/people/${id}/edit`}>
                <EditIcon size={15} />
                {l.editMember}
              </Link>
              <button
                className="btn btn-danger"
                disabled={deleteState === "deleting"}
                onClick={() => setDeleteState("confirming")}
                type="button"
              >
                <TrashIcon size={15} />
                {deleteState === "deleting" ? l.deleting : l.deleteMember}
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error" style={{ marginBottom: "1rem" }}>{errorMsg}</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Profile */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{l.memberDetail}</span>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">{l.colName}</span>
                <span className="detail-value">{user.displayName}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colRole}</span>
                <span className="detail-value">
                  {user.role === "admin" ? (
                    <span className="badge badge-default">{l.roleAdmin}</span>
                  ) : user.role === "chaplain" ? (
                    <span className="badge badge-muted">{l.chaplain}</span>
                  ) : user.role === "member" ? (
                    <span className="badge badge-muted">{l.rolePerson}</span>
                  ) : (
                    <span className="badge badge-muted">{l.roleFacilitator}</span>
                  )}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colEmail}</span>
                <span className={`detail-value${user.email ? "" : " muted"}`}>
                  {user.email ?? l.noEmail}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colPhone}</span>
                <span className={`detail-value${user.phone ? "" : " muted"}`}>
                  {user.phone ?? l.noPhone}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.authSubjectLabel}</span>
                <span className="detail-value text-sm text-muted"
                  style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                  {user.authSubject}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colCreated}</span>
                <span className="detail-value">{formatDisplayDate(user.createdAt, locale)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-cards" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-card-icon blue">
              <svg fill="none" height={20} stroke="currentColor" strokeLinecap="round"
                strokeLinejoin="round" strokeWidth={1.75} viewBox="0 0 24 24" width={20}>
                <rect height="18" rx="2" width="18" x="3" y="4" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
            <div className="stat-card-value">{meetingCount}</div>
            <div className="stat-card-label">{l.colMeetings}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon purple">
              <svg fill="none" height={20} stroke="currentColor" strokeLinecap="round"
                strokeLinejoin="round" strokeWidth={1.75} viewBox="0 0 24 24" width={20}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <div className="stat-card-value">{groups.length}</div>
            <div className="stat-card-label">{l.groups}</div>
          </div>
        </div>

        {/* Groups */}
        {groups.length > 0 ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{l.groups}</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{l.colName}</th>
                    <th>{l.colCommunity}</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <td className="text-muted">{g.community}</td>
                      <td>
                        <span className={`badge ${g.active ? "badge-success" : "badge-muted"}`}>
                          {g.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
