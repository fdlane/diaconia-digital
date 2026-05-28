"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { UsersIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminMeeting = {
  id: string;
  facilitatorName: string;
  groupName: string;
  community: string;
};

type FacilitatorRow = {
  name: string;
  groupName: string;
  community: string;
  meetingCount: number;
};

export function MembersPage() {
  const { token, locale } = useAuth();
  const l = t(locale);
  const [facilitators, setFacilitators] = useState<FacilitatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void loadMembers();
  }, [token]);

  async function loadMembers() {
    setLoading(true);
    const headers = token ? { authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${apiUrl}/meetings`, { headers });
      if (!res.ok) { setLoading(false); return; }

      const data = (await res.json()) as { meetings: AdminMeeting[] };

      const map = new Map<string, FacilitatorRow>();
      for (const s of data.meetings) {
        if (!map.has(s.facilitatorName)) {
          map.set(s.facilitatorName, {
            name: s.facilitatorName,
            groupName: s.groupName,
            community: s.community,
            meetingCount: 0,
          });
        }
        map.get(s.facilitatorName)!.meetingCount++;
      }
      setFacilitators([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      // ignore
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{l.members}</h1>
        <p className="page-subtitle">{l.membersSubtitle}</p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <span className="card-title">{l.facilitators}</span>
          {!loading && (
            <span className="text-sm text-muted">{l.found(facilitators.length)}</span>
          )}
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{l.colName}</th>
                <th>{l.colGroup}</th>
                <th>{l.colCommunity}</th>
                <th>{l.colMeetings}</th>
              </tr>
            </thead>
            <tbody>
              {facilitators.map((f) => (
                <tr key={f.name}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td>{f.groupName}</td>
                  <td className="text-muted">{f.community}</td>
                  <td>
                    <span className="badge badge-default">{f.meetingCount}</span>
                  </td>
                </tr>
              ))}
              {!facilitators.length && !loading ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    {l.noFacilitators}
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    {l.loading}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{l.groupMembers}</span>
        </div>
        <div className="card-body">
          <div className="placeholder-page" style={{ minHeight: 200 }}>
            <div className="placeholder-icon">
              <UsersIcon size={48} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--ink-2)" }}>
                {l.membersComing}
              </p>
              <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                {l.membersComingDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
