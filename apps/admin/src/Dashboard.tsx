"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { t } from "./adminLabels";
import { DeferredMeetingLocationsMap } from "./DeferredMeetingLocationsMap";
import { CalendarIcon, MeetingReportIcon, PrayerIcon } from "./icons";
import type { AdminMeeting } from "./meetingTypes";
import { StatCard } from "./StatCard";

type PrayerRequest = { id: string; status: string };

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
    const result = await apiFetch<{ meetings: AdminMeeting[] }>("/meetings", activeToken);
    if (!result.ok) {
      setMeetings([]);
      setPlannedCount(0);
      setReportsCount(0);
      setOpenPrayersCount(0);
      return;
    }

    const meetings = result.data.meetings;
    setMeetings(meetings);
    setPlannedCount(meetings.filter((s) => !s.submittedAt).length);
    setReportsCount(meetings.filter((s) => s.submittedAt).length);

    const submitted = meetings.filter((s) => s.submittedAt);
    const counts = await Promise.all(
      submitted.map(async (s) => {
        const r = await apiFetch<{ prayerRequests: PrayerRequest[] }>(
          `/meetings/${s.id}/prayer-requests`,
          activeToken,
        );
        if (!r.ok) return 0;
        return r.data.prayerRequests.filter((pr) => pr.status === "open").length;
      }),
    );
    setOpenPrayersCount(counts.reduce((sum, n) => sum + n, 0));
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
          className="dashboard-stat-card"
          description={l.plannedMeetingsDesc}
          icon={<CalendarIcon size={20} />}
          iconColor="blue"
          label={l.plannedMeetings}
          value={plannedCount}
        />
        <StatCard
          className="dashboard-stat-card"
          description={l.openPrayerRequestsDesc}
          icon={<PrayerIcon size={20} />}
          iconColor="purple"
          label={l.openPrayerRequests}
          value={openPrayersCount}
        />
        <StatCard
          className="dashboard-stat-card"
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
