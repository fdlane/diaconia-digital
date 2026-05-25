"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDisplayDate } from "@diaconia/shared";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ArrowLeftIcon, EditIcon, TrashIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export function GroupDetailPage({ id }: { id: string }) {
  const { token, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [meetingCount, setMeetingCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");

  useEffect(() => {
    void load();
  }, [id, token]);

  async function load() {
    setStatus("loading");
    const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${apiUrl}/groups/${id}`, { headers });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setStatus("error");
        return;
      }
      const data = (await res.json()) as {
        group: GroupDetail;
        meetingCount: number;
        memberships: Membership[];
      };
      setGroup(data.group);
      setMeetingCount(data.meetingCount);
      setMemberships(data.memberships);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setStatus("error");
    }
  }

  async function handleDelete() {
    setDeleteState("deleting");
    const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${apiUrl}/groups/${id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setDeleteState("idle");
        return;
      }
      router.push("/groups");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setDeleteState("idle");
    }
  }

  if (status === "loading") {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/groups">{l.groups}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{l.loading}</span>
        </nav>
        <div className="status-bar"><span className="loading-dot" /><span>{l.loading}</span></div>
      </div>
    );
  }

  if (status === "error" || !group) {
    return (
      <div>
        <nav className="breadcrumb">
          <Link href="/groups">{l.groups}</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Error</span>
        </nav>
        <div className="banner banner-error">{errorMsg || "Not found"}</div>
        <Link className="btn-link" href="/groups">
          <ArrowLeftIcon size={14} />{l.backToGroups}
        </Link>
      </div>
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
          {deleteState === "confirming" ? (
            <div className="inline-confirm">
              <span className="inline-confirm-msg">{l.confirmDeleteTitle}</span>
              <button className="btn-link" onClick={() => setDeleteState("idle")} type="button">
                {l.cancel}
              </button>
              <button className="btn btn-danger" onClick={handleDelete} type="button">
                {l.deleteBtn}
              </button>
            </div>
          ) : (
            <>
              <Link className="btn btn-secondary" href={`/groups/${id}/edit`}>
                <EditIcon size={15} />{l.editGroup}
              </Link>
              <button
                className="btn btn-danger"
                disabled={deleteState === "deleting"}
                onClick={() => setDeleteState("confirming")}
                type="button"
              >
                <TrashIcon size={15} />
                {deleteState === "deleting" ? l.deleting : l.deleteGroup}
              </button>
            </>
          )}
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
            <div className="stat-card-value">{memberships.length}</div>
            <div className="stat-card-label">{l.groupMembers}</div>
          </div>
        </div>

        {/* Steering Committee */}
        {memberships.some((a) => a.position) ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{l.steeringCommittee}</span>
            </div>
            <div className="card-body">
              <div className="detail-grid">
                {(["president", "secretary", "treasurer"] as const).map((pos) => {
                  const member = memberships.find((a) => a.position === pos);
                  const label = pos === "president" ? l.positionPresident : pos === "secretary" ? l.positionSecretary : l.positionTreasurer;
                  return (
                    <div className="detail-field" key={pos}>
                      <span className="detail-label">{label}</span>
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
                        <span className="badge badge-default">
                          {a.position === "president" ? l.positionPresident : a.position === "secretary" ? l.positionSecretary : l.positionTreasurer}
                        </span>
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
