"use client";

import { useEffect, useRef } from "react";
import type { AdminMeeting } from "./MeetingsList";

type Props = {
  meetings: AdminMeeting[];
  onSelect: (id: string) => void;
};

export function MeetingsMap({ meetings, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    void import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

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
        html: `<div style="width:12px;height:12px;border-radius:50%;background:var(--brand,#2e3192);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const bounds: [number, number][] = [];

      withLocation.forEach((s) => {
        const lat = s.latitude;
        const lng = s.longitude;
        bounds.push([lat, lng]);

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(
          `<strong>${s.groupName}</strong><br/>${s.community}<br/><small>${new Date(s.heldAt).toLocaleDateString()}</small>`,
        );
        marker.on("click", () => onSelect(s.id));
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
  }, [meetings]);

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
