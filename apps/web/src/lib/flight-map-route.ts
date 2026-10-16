import L from "leaflet";
import { projectFlightLayerPoint } from "./flight-map-geometry";

export type FlightRoute = ReturnType<typeof createFlightRoute>;

export function createFlightRoute(
  map: L.Map,
  from: L.LatLngTuple,
  to: L.LatLngTuple,
  position: L.LatLng,
) {
  // Keep the dash pattern anchored to the origin, even when it is off screen.
  const planned = L.polyline([from, to], {
    pane: "flight-routes",
    color: "#477b68",
    weight: 2,
    opacity: 0.8,
    dashArray: "2 7",
    lineCap: "round",
    noClip: true,
    interactive: false,
  }).addTo(map);

  const traveled = L.polyline([from, position], {
    pane: "flight-routes",
    color: "#477b68",
    weight: 3,
    lineCap: "butt",
    noClip: true,
    interactive: false,
  }).addTo(map);

  const draw = (nextPosition: L.LatLng) => {
    const start = projectFlightLayerPoint(map, from);
    const destination = projectFlightLayerPoint(map, to);
    const current = projectFlightLayerPoint(map, nextPosition);
    const paths: [L.Polyline, { x: number; y: number }][] = [[planned, destination], [traveled, current]];
    for (const [line, end] of paths) {
      const element = line.getElement();
      if (!element) continue;
      // Keep Leaflet's geographic bounds, but bypass its rounded SVG endpoints.
      const path = `M${start.x} ${start.y}L${end.x} ${end.y}`;
      if (element.getAttribute("d") !== path) element.setAttribute("d", path);
    }
  };
  draw(position);

  return {
    update(nextPosition: L.LatLng) {
      traveled.setLatLngs([from, nextPosition]);
      draw(nextPosition);
    },
    remove() {
      planned.remove();
      traveled.remove();
    },
  };
}
