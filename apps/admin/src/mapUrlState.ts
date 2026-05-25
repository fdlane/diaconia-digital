export const defaultSelectedMapZoom = 19;

export function parseMapZoom(value: string | null) {
  if (!value) return null;
  const zoom = Number(value);
  if (!Number.isFinite(zoom)) return null;
  return Math.min(19, Math.max(1, Math.round(zoom)));
}
