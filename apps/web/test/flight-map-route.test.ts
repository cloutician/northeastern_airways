import type { LatLng, LatLngExpression, LatLngTuple, Map as LeafletMap, Point, PolylineOptions } from "leaflet";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFlightRoute } from "../src/lib/flight-map-route";

const polyline = vi.hoisted(() => vi.fn());
vi.mock("leaflet", () => ({ default: { polyline } }));

function mockLine(points: LatLngExpression[], options: PolylineOptions) {
  const attributes = new Map<string, string>();
  const element = {
    getAttribute: vi.fn((name: string) => attributes.get(name) ?? null),
    setAttribute: vi.fn((name: string, value: string) => { attributes.set(name, value); }),
  };
  return { points, options, element, getElement: () => element, addTo: vi.fn().mockReturnThis(), setLatLngs: vi.fn().mockReturnThis(), remove: vi.fn() };
}

const from: LatLngTuple = [50.447, -5.00374];
const to: LatLngTuple = [55.948, -3.36519];
const position = { lat: 53, lng: -4.2 } as LatLng;
let scale = 1;
let origin = { x: 100, y: 200 };
const map = {
  project: (point: LatLngExpression) => {
    const lat = Array.isArray(point) ? point[0] : point.lat;
    const lng = Array.isArray(point) ? point[1] : point.lng;
    return { x: lng * 100 * scale + 0.375, y: -lat * 100 * scale + 0.625 } as Point;
  },
  getPixelOrigin: () => origin as Point,
} as LeafletMap;
const lineAt = (index: number) => polyline.mock.results[index].value as ReturnType<typeof mockLine>;

beforeEach(() => {
  scale = 1;
  origin = { x: 100, y: 200 };
  polyline.mockReset();
  polyline.mockImplementation(mockLine);
});

describe("selected flight route rendering", () => {
  it("draws a fixed dotted route and a solid segment ending at the plane", () => {
    createFlightRoute(map, from, to, position);
    const planned = lineAt(0);
    const traveled = lineAt(1);
    expect(planned.points).toEqual([from, to]);
    expect(planned.options).toMatchObject({ dashArray: "2 7", lineCap: "round" });
    expect(traveled.points).toEqual([from, position]);
    expect(traveled.options.dashArray).toBeUndefined();
    expect(traveled.options.lineCap).toBe("butt");
    expect(planned.addTo).toHaveBeenCalledWith(map);
    expect(traveled.addTo).toHaveBeenCalledWith(map);
  });

  it("keeps dashes origin-anchored when routes extend outside the viewport", () => {
    createFlightRoute(map, from, to, position);
    expect(lineAt(0).options.noClip).toBe(true);
    expect(lineAt(1).options.noClip).toBe(true);
    // No screen-pixel length or dash mask is used, so zoom/pan cannot expose a full solid path.
    expect(lineAt(1).options.dashArray).toBeUndefined();
    expect(lineAt(1).points[1]).not.toEqual(to);
  });

  it("updates the traveled geometry without redrawing the dotted route or replacing layers", () => {
    const route = createFlightRoute(map, from, to, position);
    const next = { lat: 54, lng: -3.9 } as LatLng;
    route.update(next);
    expect(lineAt(1).setLatLngs).toHaveBeenCalledOnce();
    expect(lineAt(1).setLatLngs).toHaveBeenCalledWith([from, next]);
    expect(lineAt(0).setLatLngs).not.toHaveBeenCalled();
    expect(polyline).toHaveBeenCalledTimes(2);
    expect(lineAt(0).remove).not.toHaveBeenCalled();
    expect(lineAt(1).remove).not.toHaveBeenCalled();
  });

  it("handles departure, arrival and replay wraparound without a stale full-length solid line", () => {
    const route = createFlightRoute(map, from, to, position);
    for (const point of [
      { lat: from[0], lng: from[1] },
      { lat: to[0], lng: to[1] },
      { lat: from[0] + 0.001, lng: from[1] + 0.001 },
    ]) {
      route.update(point as LatLng);
      expect(lineAt(1).setLatLngs).toHaveBeenLastCalledWith([from, point]);
    }
    expect(lineAt(0).setLatLngs).not.toHaveBeenCalled();
    expect(polyline).toHaveBeenCalledTimes(2);
  });

  it("keeps route strokes in their own non-interactive layer", () => {
    createFlightRoute(map, from, to, position);
    for (const index of [0, 1]) expect(lineAt(index).options).toMatchObject({ pane: "flight-routes", interactive: false });
  });

  it("removes both strokes when a flight is deselected", () => {
    const route = createFlightRoute(map, from, to, position);
    route.remove();
    expect(lineAt(0).remove).toHaveBeenCalledOnce();
    expect(lineAt(1).remove).toHaveBeenCalledOnce();
  });

  it("draws the moving endpoint at fractional pixels instead of a rounded staircase", () => {
    const route = createFlightRoute(map, from, to, position);
    expect(lineAt(1).element.getAttribute("d")).toContain("L-519.625 -5499.375");
    route.update({ lat: 53.0005, lng: -4.1995 } as LatLng);
    const end = map.project({ lat: 53.0005, lng: -4.1995 });
    expect(lineAt(1).element.getAttribute("d")).toContain(`L${end.x - origin.x} ${end.y - origin.y}`);
    expect(lineAt(0).element.setAttribute).toHaveBeenCalledOnce();
  });

  it("reprojects both strokes together after zooming or changing the map's pixel origin", () => {
    const route = createFlightRoute(map, from, to, position);
    scale = 5.3;
    origin = { x: 900, y: 1000 };
    route.update(position);
    const start = map.project(from);
    const destination = map.project(to);
    const current = map.project(position);
    expect(lineAt(0).element.getAttribute("d")).toBe(`M${start.x - origin.x} ${start.y - origin.y}L${destination.x - origin.x} ${destination.y - origin.y}`);
    expect(lineAt(1).element.getAttribute("d")).toBe(`M${start.x - origin.x} ${start.y - origin.y}L${current.x - origin.x} ${current.y - origin.y}`);
    expect(polyline).toHaveBeenCalledTimes(2);
  });

  it("restores precise endpoints after Leaflet redraws a rounded path", () => {
    const route = createFlightRoute(map, from, to, position);
    const plannedPath = lineAt(0).element.getAttribute("d");
    lineAt(0).element.setAttribute("d", "M-600 -5244L-436 -5794");
    route.update(position);
    expect(lineAt(0).element.getAttribute("d")).toBe(plannedPath);
  });
});
