"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "./icons";
import { AvatarCircle } from "./AvatarCircle";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminUser = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: "facilitator" | "admin";
  authSubject: string;
  createdAt: string;
  groupId: string | null;
  groupName: string | null;
  community: string | null;
  meetingCount: number;
};

export function MembersListPage() {
  const { token, locale } = useAuth();
  const l = t(locale);
  const router = useRouter();

  const [members, setMembers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void load();
  }, [token]);

  async function load() {
    setStatus("loading");
    const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${apiUrl}/users`, { headers });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(payload?.error ?? `Error ${res.status}`);
        setStatus("error");
        return;
      }
      const data = (await res.json()) as { users: AdminUser[]; warning?: string };
      setMembers(data.users);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error");
      setStatus("error");
    }
  }

  function roleBadge(role: string) {
    return role === "admin" ? (
      <span className="badge badge-default">{l.roleAdmin}</span>
    ) : (
      <span className="badge badge-muted">{l.roleFacilitator}</span>
    );
  }

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">{l.members}</h1>
          <p className="page-subtitle">{l.membersSubtitle}</p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-primary" href="/members/new">
            <PlusIcon size={15} />
            {l.newMember}
          </Link>
        </div>
      </div>

      {status === "error" ? (
        <div className="banner banner-error">{errorMsg}</div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <span className="card-title">{l.facilitators}</span>
          {status === "done" ? (
            <span className="text-sm text-muted">{l.membersFound(members.length)}</span>
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
                <th>{l.colName}</th>
                <th>{l.colEmail}</th>
                <th>{l.colRole}</th>
                <th>{l.colGroup}</th>
                <th>{l.colMeetings}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  className="row-link"
                  key={`${m.id}:${m.groupId ?? "unassigned"}`}
                  onClick={() => router.push(`/members/${m.id}`)}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <AvatarCircle
                        email={m.email}
                        name={m.displayName}
                        size={30}
                      />
                      <span style={{ fontWeight: 600 }}>{m.displayName}</span>
                    </div>
                  </td>
                  <td className="text-muted">{m.email ?? <em className="text-muted">{l.noEmail}</em>}</td>
                  <td>{roleBadge(m.role)}</td>
                  <td>
                    {m.groupName ? (
                      <>
                        <span>{m.groupName}</span>
                        {m.community ? (
                          <>
                            <br />
                            <span className="text-muted text-sm">{m.community}</span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted">{l.noGroup}</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-default">{m.meetingCount}</span>
                  </td>
                  <td className="row-action-cell">
                    <ChevronRightIcon size={16} />
                  </td>
                </tr>
              ))}
              {!members.length && status === "done" ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><UsersIcon size={40} /></div>
                      <p className="empty-state-title">{l.noFacilitators}</p>
                      <Link className="btn btn-primary" href="/members/new">
                        <PlusIcon size={14} />{l.newMember}
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
