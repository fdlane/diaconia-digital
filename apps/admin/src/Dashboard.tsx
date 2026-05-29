"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { DeferredMeetingLocationsMap } from "./DeferredMeetingLocationsMap";
import { CalendarIcon, MeetingReportIcon, PrayerIcon } from "./icons";
import type { AdminMeeting } from "./meetingTypes";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
    <div className="stat-card dashboard-stat-card">
      <div className={`stat-card-icon ${iconColor}`}>{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-desc">{description}</div>
    </div>
  );
}

export function Dashboard() {
  const { token, isLoaded, locale } = useAuth();
  const l = t(locale);
  const hasLoadedStatsRef = useRef(false);

  const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
  const [plannedCount, setPlannedCount] = useState<number | "…">("…");
  const [reportsCount, setReportsCount] = useState<number | "…">("…");
  const [openPrayersCount, setOpenPrayersCount] = useState<number | "…">("…");

  useEffect(() => {
    if (!isLoaded || !token || hasLoadedStatsRef.current) return;
    hasLoadedStatsRef.current = true;
    void loadStats(token);
  }, [isLoaded, token]);

  async function loadStats(activeToken: string) {
    const headers = { authorization: `Bearer ${activeToken}` };

    try {
      const res = await fetch(`${apiUrl}/meetings`, { headers });
      if (!res.ok) return;

      const data = (await res.json()) as { meetings: AdminMeeting[] };
      const meetings = data.meetings;
      setMeetings(meetings);

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
      setMeetings([]);
      setPlannedCount(0);
      setReportsCount(0);
      setOpenPrayersCount(0);
    }
  }

  const statsLoading = plannedCount === "…" || reportsCount === "…" || openPrayersCount === "…";
  const activeMeetingsWithLocation = useMemo(
    () =>
      meetings.filter(
        (meeting) =>
          meeting.status !== "cancelled" &&
          !meeting.submittedAt &&
          meeting.latitude != null &&
          meeting.longitude != null,
      ),
    [meetings],
  );

  return (
    <div className="dashboard-page">
      {statsLoading ? (
        <div className="dashboard-loading" role="status" aria-live="polite">
          <span className="loading-dot" />
          <span>{l.loading}</span>
        </div>
      ) : null}

      <div className="stat-cards dashboard-stat-cards">
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

      <div className="card dashboard-map-card">
        <div className="card-header">
          <span className="card-title">{l.activeMeetingsMap}</span>
        </div>
        <div className="card-body dashboard-map-body">
          <DeferredMeetingLocationsMap
            fitBoundsMaxZoom={12}
            height="var(--dashboard-map-height)"
            locale={locale}
            loadingLabel={l.loading}
            meetings={activeMeetingsWithLocation}
            stewardLabel={l.loanSteward}
            unavailableLabel={l.mapUnavailable}
            viewDetailsLabel={l.viewMeetingDetail}
          />
        </div>
      </div>
    </div>
  );
}
