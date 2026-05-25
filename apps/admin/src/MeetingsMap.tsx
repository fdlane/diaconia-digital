"use client";

import { type SupportedLocale } from "@diaconia/shared";
import { type CSSProperties } from "react";
import { DeferredMeetingLocationsMap } from "./DeferredMeetingLocationsMap";
import type { AdminMeeting } from "./meetingTypes";

type Props = {
  height?: CSSProperties["height"];
  meetings: AdminMeeting[];
  selectedMeetingId: string;
  selectedZoom: number | null;
  locale: SupportedLocale;
  stewardLabel: string;
  unavailableLabel: string;
  viewDetailsLabel: string;
  onSelect: (id: string) => void;
  onZoomChange: (zoom: number) => void;
};

export function MeetingsMap({
  height,
  meetings,
  selectedMeetingId,
  selectedZoom,
  locale,
  stewardLabel,
  unavailableLabel,
  viewDetailsLabel,
  onSelect,
  onZoomChange,
}: Props) {
  return (
    <DeferredMeetingLocationsMap
      locale={locale}
      loadingLabel={locale === "es" ? "Cargando..." : "Loading..."}
      {...(height ? { height } : {})}
      meetings={meetings}
      onSelect={onSelect}
      onZoomChange={onZoomChange}
      selectedMeetingId={selectedMeetingId}
      selectedZoom={selectedZoom}
      stewardLabel={stewardLabel}
      unavailableLabel={unavailableLabel}
      viewDetailsLabel={viewDetailsLabel}
    />
  );
}
