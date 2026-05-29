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

type GroupDetail = {
  id: string;
  name: string;
  community: string;
  active: boolean;
  facilitatorId: string;
  facilitatorName: string;
  facilitatorEmail: string | null;
  chaplainId: string | null;
  chaplainName: string | null;
  chaplainEmail: string | null;
  createdAt: string;
};

type Membership = {
  id: string;
  userId: string;
  displayName: string;
  phone: string | null;
  position: "president" | "secretary" | "treasurer" | null;
  active: boolean;
};

type GroupDetailResponse = {
  group: GroupDetail;
  meetingCount: number;
  memberships: Membership[];
};

export function GroupDetailPage({ id }: { id: string }) {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [meetingCount, setMeetingCount] = useState(0);
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
    const result = await apiFetch<GroupDetailResponse>(`/groups/${id}`, token);
    if (!result.ok) {
      setErrorMsg(result.error);
      setStatus("error");
      return;
    }
    setGroup(result.data.group);
    setMeetingCount(result.data.meetingCount);
    setMemberships(result.data.memberships);
    setStatus("done");
  }

  async function handleDelete() {
    if (!token) { setErrorMsg(l.authMissingSession); return; }
    setDeleteState("deleting");
    const result = await apiFetch(`/groups/${id}`, token, { method: "DELETE" });
    if (!result.ok) {
      setErrorMsg(result.error);
      setDeleteState("idle");
      return;
    }
    router.push("/groups");
  }

  function positionLabel(pos: Membership["position"]) {
    if (pos === "president") return l.positionPresident;
    if (pos === "secretary") return l.positionSecretary;
    return l.positionTreasurer;
  }

  const breadcrumbs = [
    { label: l.groups, href: "/groups" },
    { label: status === "loading" ? l.loading : (group?.name ?? "Error") },
  ];

  if (status === "loading") {
    return <PageLoadingState breadcrumbs={breadcrumbs} loadingLabel={l.loading} />;
  }

  if (status === "error" || !group) {
    return (
      <PageErrorState
        backHref="/groups"
        backLabel={l.backToGroups}
        breadcrumbs={breadcrumbs}
        errorMsg={errorMsg}
      />
    );
  }

  return (
    <div>
      <nav className="breadcrumb">
        <Link href="/groups">{l.groups}</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{group.name}</span>
      </nav>

      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{group.name}</h1>
          <p className="page-subtitle">{group.community}</p>
          <p className="page-subtitle">
            {l.loanSteward}:{" "}
            <Link href={`/people/${group.facilitatorId}`} style={{ color: "var(--brand)", fontWeight: 600 }}>
              {group.facilitatorName}
            </Link>
          </p>
        </div>
        <div className="page-header-actions">
          <DeleteConfirmActions
            cancelLabel={l.cancel}
            confirmLabel={l.deleteBtn}
            confirmMsg={l.confirmDeleteTitle}
            deleteLabel={l.deleteGroup}
            deleteState={deleteState}
            deletingLabel={l.deleting}
            editHref={`/groups/${id}/edit`}
            editLabel={l.editGroup}
            onCancel={() => setDeleteState("idle")}
            onConfirm={() => setDeleteState("confirming")}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error">{errorMsg}</div> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">{l.groupDetail}</span>
            <span className={`badge ${group.active ? "badge-success" : "badge-muted"}`}>
              {group.active ? l.groupActive : l.groupInactive}
            </span>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">{l.groupName}</span>
                <span className="detail-value">{group.name}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.groupCommunity}</span>
                <span className="detail-value">{group.community}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.loanSteward}</span>
                <span className="detail-value">
                  <Link href={`/people/${group.facilitatorId}`} style={{ color: "var(--brand)" }}>
                    {group.facilitatorName}
                  </Link>
                  {group.facilitatorEmail ? (
                    <>
                      <br />
                      <span className="text-sm text-muted">{group.facilitatorEmail}</span>
                    </>
                  ) : null}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.chaplainAssigned}</span>
                <span className="detail-value">
                  {group.chaplainName ? (
                    <>
                      {group.chaplainId ? (
                        <Link href={`/people/${group.chaplainId}`} style={{ color: "var(--brand)" }}>
                          {group.chaplainName}
                        </Link>
                      ) : group.chaplainName}
                      {group.chaplainEmail ? (
                        <>
                          <br />
                          <span className="text-sm text-muted">{group.chaplainEmail}</span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted">{l.noChaplain}</span>
                  )}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">{l.colCreated}</span>
                <span className="detail-value">{formatDisplayDate(group.createdAt, locale)}</span>
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
            label={l.groupMembers}
            value={memberships.length}
          />
        </div>

        {memberships.some((a) => a.position) ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{l.steeringCommittee}</span>
            </div>
            <div className="card-body">
              <div className="detail-grid">
                {(["president", "secretary", "treasurer"] as const).map((pos) => {
                  const member = memberships.find((a) => a.position === pos);
                  return (
                    <div className="detail-field" key={pos}>
                      <span className="detail-label">{positionLabel(pos)}</span>
                      <span className="detail-value">
                        {member ? member.displayName : <span className="text-muted">—</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <div className="card">
          <div className="card-header">
            <span className="card-title">{l.groupMembers}</span>
            {memberships.length > 0 ? (
              <span className="text-sm text-muted">{memberships.length}</span>
            ) : null}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{l.colName}</th>
                  <th>{l.assignPosition}</th>
                  <th>{l.colPhone}</th>
                  <th>{l.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((a) => (
                  <tr key={a.id}>
                    <td>{a.displayName}</td>
                    <td>
                      {a.position ? (
                        <span className="badge badge-default">{positionLabel(a.position)}</span>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td className="text-muted">{a.phone ?? l.noPhone}</td>
                    <td>
                      <span className={`badge ${a.active ? "badge-success" : "badge-muted"}`}>
                        {a.active ? l.groupActive : l.groupInactive}
                      </span>
                    </td>
                  </tr>
                ))}
                {!memberships.length ? (
                  <tr>
                    <td className="table-empty" colSpan={4}>{l.noGroupMembers}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
