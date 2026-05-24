"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { UsersIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminSession = {
  id: string;
  facilitatorName: string;
  groupName: string;
  community: string;
  heldAt: string;
};

type FacilitatorRow = {
  name: string;
  groupName: string;
  community: string;
  sessionCount: number;
};

export function MembersPage() {
  const { token } = useAuth();
  const [facilitators, setFacilitators] = useState<FacilitatorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMembers();
  }, [token]);

  async function loadMembers() {
    setLoading(true);
    const headers = token ? { authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${apiUrl}/admin/sessions`, { headers });
      if (!res.ok) { setLoading(false); return; }

      const data = (await res.json()) as { sessions: AdminSession[] };

      const map = new Map<string, FacilitatorRow>();
      for (const s of data.sessions) {
        const key = s.facilitatorName;
        if (!map.has(key)) {
          map.set(key, {
            name: s.facilitatorName,
            groupName: s.groupName,
            community: s.community,
            sessionCount: 0,
          });
        }
        const entry = map.get(key)!;
        entry.sessionCount++;
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
        <h1 className="page-title">Members</h1>
        <p className="page-subtitle">Facilitators and group members</p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <span className="card-title">Facilitators</span>
          {!loading && (
            <span className="text-sm text-muted">{facilitators.length} found</span>
          )}
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Community</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {facilitators.map((f) => (
                <tr key={f.name}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td>{f.groupName}</td>
                  <td className="text-muted">{f.community}</td>
                  <td>
                    <span className="badge badge-default">{f.sessionCount}</span>
                  </td>
                </tr>
              ))}
              {!facilitators.length && !loading ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    No facilitators found
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td className="table-empty" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Group Attendees</span>
        </div>
        <div className="card-body">
          <div className="placeholder-page" style={{ minHeight: 200 }}>
            <div className="placeholder-icon">
              <UsersIcon size={48} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--ink-2)" }}>
                Attendee management coming soon
              </p>
              <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                Group-level attendee lists will be available here once the roster API is ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
