import { describe, expect, it, vi } from "vitest";
import { desktopSidebarMediaQuery, getInitialSidebarOpen } from "./sidebarState";

describe("getInitialSidebarOpen", () => {
  it("opens the sidebar by default when the desktop media query matches", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(getInitialSidebarOpen(matchMedia)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(desktopSidebarMediaQuery);
  });

  it("closes the sidebar by default when the desktop media query does not match", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false });

    expect(getInitialSidebarOpen(matchMedia)).toBe(false);
  });

  it("opens the sidebar when matchMedia is unavailable", () => {
    expect(getInitialSidebarOpen(undefined)).toBe(true);
  });
});
