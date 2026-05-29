"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { CalendarIcon, UsersIcon } from "./icons";
import { DeleteConfirmActions } from "./DeleteConfirmActions";
import { PageErrorState } from "./PageErrorState";
import { PageLoadingState } from "./PageLoadingState";
import { StatCard } from "./StatCard";

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

type UserDetailResponse = { user: UserDetail; groups: GroupRow[]; meetingCount: number };

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
    const result = await apiFetch<UserDetailResponse>(`/users/${id}`, token);
    if (!result.ok) {
      setErrorMsg(result.error);
      setStatus("error");
      return;
    }
    setUser(result.data.user);
    setGroups(result.data.groups);
    setMeetingCount(result.data.meetingCount);
    setStatus("done");
  }

  async function handleDelete() {
    if (!token) { setErrorMsg(l.authMissingSession); return; }
    setDeleteState("deleting");
    const result = await apiFetch(`/users/${id}`, token, { method: "DELETE" });
    if (!result.ok) {
      setErrorMsg(result.error);
      setDeleteState("idle");
      return;
    }
    router.push("/people");
  }

  const breadcrumbs = [
    { label: l.members, href: "/people" },
    { label: status === "loading" ? l.loading : (user?.displayName ?? "Error") },
  ];

  if (status === "loading") {
    return <PageLoadingState breadcrumbs={breadcrumbs} loadingLabel={l.loading} />;
  }

  if (status === "error" || !user) {
    return (
      <PageErrorState
        backHref="/people"
        backLabel={l.backToMembers}
        breadcrumbs={breadcrumbs}
        errorMsg={errorMsg}
      />
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
          <p className="page-subtitle">{roleLabel(user.role)}</p>
        </div>
        <div className="page-header-actions">
          <DeleteConfirmActions
            cancelLabel={l.cancel}
            confirmLabel={l.deleteBtn}
            confirmMsg={l.confirmDeleteTitle}
            deleteLabel={l.deleteMember}
            deleteState={deleteState}
            deletingLabel={l.deleting}
            editHref={`/people/${id}/edit`}
            editLabel={l.editMember}
            onCancel={() => setDeleteState("idle")}
            onConfirm={() => setDeleteState("confirming")}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error" style={{ marginBottom: "1rem" }}>{errorMsg}</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                <span
                  className="detail-value text-sm text-muted"
                  style={{ fontFamily: "monospace", wordBreak: "break-all" }}
                >
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

        <div className="stat-cards" style={{ marginBottom: 0 }}>
          <StatCard
            icon={<CalendarIcon size={20} />}
            iconColor="blue"
            label={l.colMeetings}
            value={meetingCount}
          />
          <StatCard
            icon={<UsersIcon size={20} />}
            iconColor="purple"
            label={l.groups}
            value={groups.length}
          />
        </div>

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
                    <th>{l.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.name}</td>
                      <td className="text-muted">{g.community}</td>
                      <td>
                        <span className={`badge ${g.active ? "badge-success" : "badge-muted"}`}>
                          {g.active ? l.groupActive : l.groupInactive}
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
