"use client";

import { Component, useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { MeetingLocationsMapProps } from "./MeetingLocationsMap";

type Props = MeetingLocationsMapProps & {
  loadingLabel: string;
};

type BoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type BoundaryState = {
  hasError: boolean;
};

export function DeferredMeetingLocationsMap({ loadingLabel, unavailableLabel, height = 480, ...props }: Props) {
  const [ready, setReady] = useState(false);
  const [MapComponent, setMapComponent] = useState<ComponentType<MeetingLocationsMapProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const fallback = <MapFallback height={height} label={loadFailed ? (unavailableLabel ?? loadingLabel) : loadingLabel} />;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let idleId: number | undefined;

    const loadMap = () => {
      setReady(true);
      void import("./MeetingLocationsMap")
        .then((module) => {
          if (!cancelled) setMapComponent(() => module.MeetingLocationsMap);
        })
        .catch(() => {
          if (!cancelled) setLoadFailed(true);
        });
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(loadMap, { timeout: 1_000 });
    } else {
      timeoutId = globalThis.setTimeout(loadMap, 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    };
  }, []);

  if (!ready || loadFailed || !MapComponent) return fallback;

  return (
    <MapErrorBoundary fallback={<MapFallback height={height} label={unavailableLabel ?? loadingLabel} />}>
      <MapComponent
        {...props}
        {...(unavailableLabel ? { unavailableLabel } : {})}
        height={height}
      />
    </MapErrorBoundary>
  );
}

class MapErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
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
