"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { CalendarIcon, MeetingReportIcon, PrayerIcon, UsersIcon } from "./icons";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminMeeting = {
  id: string;
  heldAt: string;
  submittedAt: string | null;
};

type PrayerRequest = { id: string; status: string };

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
  const { token, currentUser, locale } = useAuth();
  const l = t(locale);

  const [plannedCount, setPlannedCount] = useState<number | "…">("…");
  const [reportsCount, setReportsCount] = useState<number | "…">("…");
  const [openPrayersCount, setOpenPrayersCount] = useState<number | "…">("…");

  useEffect(() => {
    void loadStats();
  }, [token]);

  async function loadStats() {
    const headers = token ? { authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${apiUrl}/meetings`, { headers });
      if (!res.ok) return;

      const data = (await res.json()) as { meetings: AdminMeeting[] };
      const meetings = data.meetings;

      setPlannedCount(meetings.filter((s) => !s.submittedAt).length);
      setReportsCount(meetings.filter((s) => s.submittedAt).length);

      const submitted = meetings.filter((s) => s.submittedAt);
      const counts = await Promise.all(
        submitted.map(async (s) => {
          try {
            const r = await fetch(`${apiUrl}/meetings/${s.id}/prayer-requests`, {
              headers,
            });
            if (!r.ok) return 0;
            const p = (await r.json()) as { prayerRequests: PrayerRequest[] };
            return p.prayerRequests.filter((pr) => pr.status === "open").length;
          } catch {
            return 0;
          }
        }),
      );
      setOpenPrayersCount(counts.reduce((sum, n) => sum + n, 0));
    } catch {
      setPlannedCount(0);
      setReportsCount(0);
      setOpenPrayersCount(0);
    }
  }

  const firstName = currentUser?.displayName.split(" ")[0];
  const greeting = firstName ? l.greeting(firstName) : l.greetingFallback;

  const today = new Intl.DateTimeFormat(locale === "es" ? "es-PY" : "en", {
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
          description={l.plannedMeetingsDesc}
          icon={<CalendarIcon size={20} />}
          iconColor="blue"
          label={l.plannedMeetings}
          value={plannedCount}
        />
        <StatCard
          description={l.openPrayerRequestsDesc}
          icon={<PrayerIcon size={20} />}
          iconColor="purple"
          label={l.openPrayerRequests}
          value={openPrayersCount}
        />
        <StatCard
          description={l.meetingReportsDesc}
          icon={<MeetingReportIcon size={20} />}
          iconColor="green"
          label={l.meetingReports}
          value={reportsCount}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{l.quickLinks}</span>
        </div>
        <div className="card-body">
          <div className="quick-links">
            <a className="quick-link" href="/meetings">
              <CalendarIcon size={18} />
              {l.viewAllMeetings}
            </a>
            <a className="quick-link" href="/members">
              <UsersIcon size={18} />
              {l.viewMembers}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
