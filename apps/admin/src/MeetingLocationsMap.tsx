"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatDisplayDate, type SupportedLocale } from "@diaconia/shared";
import { defaultSelectedMapZoom } from "./mapUrlState";
import type { AdminMeeting } from "./meetingTypes";

type MeetingWithLocation = AdminMeeting & { latitude: number; longitude: number };

export type MeetingLocationsMapProps = {
  meetings: AdminMeeting[];
  locale: SupportedLocale;
  stewardLabel: string;
  viewDetailsLabel: string;
  unavailableLabel?: string;
  height?: CSSProperties["height"];
  selectedMeetingId?: string;
  selectedZoom?: number | null;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  fitBoundsMaxZoom?: number;
  scrollWheelZoom?: boolean;
  onSelect?: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
};

const defaultMapCenter: [number, number] = [-25.2712003, -57.496089];

export function MeetingLocationsMap({
  meetings,
  locale,
  stewardLabel,
  viewDetailsLabel,
  unavailableLabel = "Map unavailable.",
  height = 480,
  selectedMeetingId = "",
  selectedZoom = null,
  defaultCenter = defaultMapCenter,
  defaultZoom = 13,
  fitBoundsMaxZoom = 13,
  scrollWheelZoom = true,
  onSelect,
  onZoomChange,
}: MeetingLocationsMapProps) {
  const router = useRouter();
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Record<string, import("leaflet").Marker>>({});
  const onSelectRef = useRef(onSelect);
  const onZoomChangeRef = useRef(onZoomChange);
  const selectedMeetingIdRef = useRef(selectedMeetingId);
  const selectedZoomRef = useRef(selectedZoom);
  const suppressZoomUrlUpdateUntilRef = useRef(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    selectedMeetingIdRef.current = selectedMeetingId;
    selectedZoomRef.current = selectedZoom;
  }, [selectedMeetingId, selectedZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const mapContainer = container;

    function handlePopupRouteClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[data-app-route]");
      const href = link?.getAttribute("href");

      if (!link || !href || !href.startsWith("/") || !mapContainer.contains(link)) return;

      event.preventDefault();
      router.push(href);
    }

    mapContainer.addEventListener("click", handlePopupRouteClick);
    return () => mapContainer.removeEventListener("click", handlePopupRouteClick);
  }, [router]);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    void import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current) return;
      setLoadError(false);

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      if (!document.head.querySelector('link[href*="leaflet"]')) {
        document.head.appendChild(link);
      }

      const withLocation = meetings.filter(isMeetingWithLocation);
      const selectedMeeting = withLocation.find((meeting) => meeting.id === selectedMeetingIdRef.current);
      const initialCenter: [number, number] = selectedMeeting
        ? [selectedMeeting.latitude, selectedMeeting.longitude]
        : defaultCenter;
      const initialZoom = selectedMeeting ? (selectedZoomRef.current ?? defaultSelectedMapZoom) : defaultZoom;

      const map = L.map(containerRef.current, { scrollWheelZoom, touchZoom: true }).setView(
        initialCenter,
        initialZoom,
      );
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2e3192;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const bounds: [number, number][] = [];

      withLocation.forEach((meeting) => {
        const lat = meeting.latitude;
        const lng = meeting.longitude;
        bounds.push([lat, lng]);

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(meetingPopupHtml(meeting, locale, stewardLabel, viewDetailsLabel));
        marker.on("click", () => {
          onSelectRef.current?.(meeting.id);
          marker.openPopup();
        });
        markersRef.current[meeting.id] = marker;
      });

      if (!selectedMeeting && bounds.length > 0) {
        suppressZoomUrlUpdates();
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: fitBoundsMaxZoom });
      }

      map.on("zoomend", () => {
        if (Date.now() < suppressZoomUrlUpdateUntilRef.current) return;
        onZoomChangeRef.current?.(Math.round(map.getZoom()));
      });

      focusSelectedMarker(selectedMeetingIdRef.current);
    }).catch(() => {
      if (isMounted) setLoadError(true);
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [
    defaultCenter,
    defaultZoom,
    fitBoundsMaxZoom,
    locale,
    meetings,
    scrollWheelZoom,
    stewardLabel,
    viewDetailsLabel,
  ]);

  useEffect(() => {
    focusSelectedMarker(selectedMeetingId);
  }, [selectedMeetingId, selectedZoom]);

  function focusSelectedMarker(id: string) {
    if (!id) return;
    const marker = markersRef.current[id];
    const map = mapRef.current;
    if (!marker || !map) return;

    suppressZoomUrlUpdates();
    map.setView(marker.getLatLng(), selectedZoomRef.current ?? defaultSelectedMapZoom, { animate: true });
    marker.openPopup();
  }

  function suppressZoomUrlUpdates() {
    suppressZoomUrlUpdateUntilRef.current = Date.now() + 900;
  }

  if (loadError) {
    return <MapFallback height={height} label={unavailableLabel} />;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    />
  );
}

function MapFallback({ height, label }: { height: CSSProperties["height"]; label: string }) {
  return (
    <div
      className="text-sm text-muted"
      style={{
        width: "100%",
        height,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "1rem",
      }}
    >
      {label}
    </div>
  );
}

function isMeetingWithLocation(meeting: AdminMeeting): meeting is MeetingWithLocation {
  return meeting.latitude != null && meeting.longitude != null;
}

function meetingPopupHtml(
  meeting: AdminMeeting,
  locale: SupportedLocale,
  stewardLabel: string,
  viewDetailsLabel: string,
) {
  return `
    <div class="map-popup">
      <strong>${escapeHtml(meeting.groupName)}</strong>
      <span>${escapeHtml(meeting.community)}</span>
      <small>${escapeHtml(formatDisplayDate(meeting.heldAt, locale))}</small>
      <span class="map-popup-steward">
        ${escapeHtml(stewardLabel)}:
        <a data-app-route href="/people/${encodeURIComponent(meeting.facilitatorId)}">${escapeHtml(meeting.facilitatorName)}</a>
      </span>
      <a class="map-popup-detail-link" data-app-route href="/meetings/${encodeURIComponent(meeting.id)}">${escapeHtml(viewDetailsLabel)}</a>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
