import type { LatLng, Map as LeafletMap } from "leaflet";

export function zoomSelectedFlight(
  map: LeafletMap,
  position: LatLng | null,
  direction: 1 | -1,
  shiftKey = false,
): boolean {
  if (!position) return false;
  const current = map.getZoom();
  const step = (map.options.zoomDelta ?? 1) * (shiftKey ? 3 : 1);
  const next = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), current + direction * step));
  if (next !== current) map.setView(position, next, { animate: true });
  return true;
}
