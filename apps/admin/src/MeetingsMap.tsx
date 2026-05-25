"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { formatDisplayDate, type SupportedLocale } from "@diaconia/shared";
import type { AdminMeeting } from "./MeetingsList";

type Props = {
  meetings: AdminMeeting[];
  selectedMeetingId: string;
  locale: SupportedLocale;
  stewardLabel: string;
  viewDetailsLabel: string;
  onSelect: (id: string) => void;
};

export function MeetingsMap({
  meetings,
  selectedMeetingId,
  locale,
  stewardLabel,
  viewDetailsLabel,
  onSelect,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Record<string, import("leaflet").Marker>>({});
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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

      const withLocation = meetings.filter(
        (s): s is AdminMeeting & { latitude: number; longitude: number } =>
          s.latitude != null && s.longitude != null,
      );

      const defaultCenter: [number, number] = [-23.4, -57.4];
      const defaultZoom = withLocation.length ? undefined : 6;

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        defaultCenter,
        defaultZoom ?? 6,
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

      withLocation.forEach((s) => {
        const lat = s.latitude;
        const lng = s.longitude;
        bounds.push([lat, lng]);

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(meetingPopupHtml(s, locale, stewardLabel, viewDetailsLabel));
        marker.on("click", () => {
          onSelectRef.current(s.id);
          marker.openPopup();
        });
        markersRef.current[s.id] = marker;
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [meetings, locale, stewardLabel, viewDetailsLabel]);

  useEffect(() => {
    if (!selectedMeetingId) return;
    const marker = markersRef.current[selectedMeetingId];
    if (!marker) return;

    marker.openPopup();
    mapRef.current?.panTo(marker.getLatLng());
  }, [selectedMeetingId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 480,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    />
  );
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
        <a data-app-route href="/members/${encodeURIComponent(meeting.facilitatorId)}">${escapeHtml(meeting.facilitatorName)}</a>
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
