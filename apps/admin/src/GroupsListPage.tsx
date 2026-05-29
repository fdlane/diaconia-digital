"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { localizeRouteError, t } from "./adminLabels";
import { ChevronRightIcon, GroupsIcon, PlusIcon } from "./icons";

type GroupRow = {
  id: string;
  name: string;
  community: string;
  active: boolean;
  facilitatorId: string;
  facilitatorName: string;
  createdAt: string;
};

export function GroupsListPage() {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !token || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void load();
  }, [isLoaded, token]);

  async function load() {
    if (!token) { setErrorMsg(l.authMissingSession); setStatus("error"); return; }
    setStatus("loading");
    const result = await apiFetch<{ groups: GroupRow[]; warning?: string }>("/groups", token);
    if (!result.ok) {
      setErrorMsg(localizeRouteError({ error: result.error }, l));
      setStatus("error");
      return;
    }
    setGroups(result.data.groups);
    setStatus("done");
  }

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{l.groups}</h1>
          <p className="page-subtitle">{l.groupsSubtitle}</p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-primary" href="/groups/new">
            <PlusIcon size={15} />
            {l.newGroup}
          </Link>
        </div>
      </div>

      {errorMsg ? <div className="banner banner-error">{errorMsg}</div> : null}

      <div className="card">
        <div className="card-header">
          <span className="card-title">{l.groups}</span>
          {status === "done" ? (
            <span className="text-sm text-muted">{l.groupsFound(groups.length)}</span>
          ) : null}
        </div>

        {status === "loading" ? (
          <div className="status-bar">
            <span className="loading-dot" />
            <span>{l.loading}</span>
          </div>
        ) : null}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{l.groupName}</th>
                <th>{l.groupCommunity}</th>
                <th>{l.loanSteward}</th>
                <th>{l.colStatus}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  className="row-link"
                  key={g.id}
                  onClick={() => router.push(`/groups/${g.id}`)}
                >
                  <td style={{ fontWeight: 600 }}>{g.name}</td>
                  <td className="text-muted">{g.community}</td>
                  <td>{g.facilitatorName}</td>
                  <td>
                    <span className={`badge ${g.active ? "badge-success" : "badge-muted"}`}>
                      {g.active ? l.groupActive : l.groupInactive}
                    </span>
                  </td>
                  <td className="row-action-cell">
                    <ChevronRightIcon size={16} />
                  </td>
                </tr>
              ))}
              {!groups.length && status === "done" ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><GroupsIcon size={40} /></div>
                      <p className="empty-state-title">{l.noGroups}</p>
                      <Link className="btn btn-primary" href="/groups/new">
                        <PlusIcon size={14} />{l.newGroup}
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
