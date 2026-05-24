"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { CalendarIcon, MeetingReportIcon, PrayerIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminSession = {
  id: string;
  heldAt: string;
  submittedAt: string | null;
  groupName: string;
  facilitatorName: string;
};

type PrayerRequest = {
  id: string;
  status: string;
};

type StatCardProps = {
  icon: React.ReactNode;
  iconColor: "blue" | "purple" | "green";
  value: number | string;
  label: string;
  description: string;
};

function StatCard({ icon, iconColor, value, label, description }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-card-icon ${iconColor}`}>{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-desc">{description}</div>
    </div>
  );
}

export function Dashboard() {
  const { token, currentUser } = useAuth();

  const [plannedCount, setPlannedCount] = useState<number | "…">("…");
  const [reportsCount, setReportsCount] = useState<number | "…">("…");
  const [openPrayersCount, setOpenPrayersCount] = useState<number | "…">("…");

  useEffect(() => {
    void loadStats();
  }, [token]);

  async function loadStats() {
    const headers = token ? { authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${apiUrl}/admin/sessions`, { headers });
      if (!res.ok) return;

      const data = (await res.json()) as { sessions: AdminSession[] };
      const sessions = data.sessions;

      const planned = sessions.filter((s) => !s.submittedAt).length;
      const submitted = sessions.filter((s) => s.submittedAt).length;
      setPlannedCount(planned);
      setReportsCount(submitted);

      const submittedSessions = sessions.filter((s) => s.submittedAt);
      const prayerResults = await Promise.all(
        submittedSessions.map(async (session) => {
          try {
            const r = await fetch(
              `${apiUrl}/admin/sessions/${session.id}/prayer-requests`,
              { headers },
            );
            if (!r.ok) return 0;
            const p = (await r.json()) as { prayerRequests: PrayerRequest[] };
            return p.prayerRequests.filter((pr) => pr.status === "open").length;
          } catch {
            return 0;
          }
        }),
      );
      setOpenPrayersCount(prayerResults.reduce((sum, n) => sum + n, 0));
    } catch {
      setPlannedCount(0);
      setReportsCount(0);
      setOpenPrayersCount(0);
    }
  }

  const greeting = currentUser?.displayName
    ? `Welcome back, ${currentUser.displayName.split(" ")[0]}`
    : "Welcome back";

  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{greeting}</h1>
        <p className="page-subtitle">{today}</p>
      </div>

      <div className="stat-cards">
        <StatCard
          description="Meetings awaiting submission"
          icon={<CalendarIcon size={20} />}
          iconColor="blue"
          label="Planned Meetings"
          value={plannedCount}
        />
        <StatCard
          description="Prayer requests still open"
          icon={<PrayerIcon size={20} />}
          iconColor="purple"
          label="Open Prayer Requests"
          value={openPrayersCount}
        />
        <StatCard
          description="Reports submitted by facilitators"
          icon={<MeetingReportIcon size={20} />}
          iconColor="green"
          label="Meeting Reports"
          value={reportsCount}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Quick Links</span>
        </div>
        <div className="card-body">
          <div className="quick-links">
            <a className="quick-link" href="/meetings">
              <CalendarIcon size={18} />
              View all meetings
            </a>
            <a className="quick-link" href="/members">
              View members
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
