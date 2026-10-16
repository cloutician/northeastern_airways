import type { LatLngExpression, Map as LeafletMap } from "leaflet";

type ProjectedPoint = { x: number; y: number };

// Leaflet's latLngToLayerPoint rounds each axis; animated flights need subpixel precision.
export function projectFlightLayerPoint(
  map: Pick<LeafletMap, "project" | "getPixelOrigin">,
  position: LatLngExpression,
): ProjectedPoint {
  const point = map.project(position);
  const origin = map.getPixelOrigin();
  return { x: point.x - origin.x, y: point.y - origin.y };
}

/** Demo positions loop over the seeded flight duration; active positions use the timetable. */
export function computeMapProgress(
  timing: { depTime: number; arrTime: number },
  key: string,
  scope: "active" | "demo",
  now: number,
): number {
  const total = timing.arrTime - timing.depTime;
  if (total <= 0) return 1;
  if (scope === "demo") {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return ((now + Math.abs(hash)) % Math.max(total, 60_000)) / Math.max(total, 60_000);
  }
  return Math.min(Math.max((now - timing.depTime) / total, 0), 1);
}

// The Lucide plane points northeast before CSS rotation; screen Y increases downwards.
export function planeRotationDeg(from: ProjectedPoint, to: ProjectedPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return 0;
  return Math.atan2(dy, dx) * 180 / Math.PI + 45;
}

export function interpolateProjectedRoute(
  from: ProjectedPoint,
  to: ProjectedPoint,
  progress: number,
): ProjectedPoint {
  const fraction = Math.min(1, Math.max(0, progress));
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  };
}
