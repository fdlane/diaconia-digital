export const desktopSidebarMediaQuery = "(min-width: 769px)";

type MatchMedia = Window["matchMedia"];

export function getInitialSidebarOpen(matchMedia: MatchMedia | undefined): boolean {
  if (!matchMedia) return true;

  return matchMedia(desktopSidebarMediaQuery).matches;
}
