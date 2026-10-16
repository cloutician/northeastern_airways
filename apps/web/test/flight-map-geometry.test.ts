import { describe, expect, it } from "vitest";
import type { Point } from "leaflet";
import { interpolateProjectedRoute, planeRotationDeg, projectFlightLayerPoint } from "../src/lib/flight-map-geometry";

describe("plane headings in Leaflet's screen coordinates", () => {
  it.each([
    ["north", { x: 0, y: -1 }, -45],
    ["northeast", { x: 1, y: -1 }, 0],
    ["east", { x: 1, y: 0 }, 45],
    ["southeast", { x: 1, y: 1 }, 90],
    ["south", { x: 0, y: 1 }, 135],
    ["southwest", { x: -1, y: 1 }, 180],
    ["west", { x: -1, y: 0 }, 225],
    ["northwest", { x: -1, y: -1 }, -90],
  ] as const)("points the northeast-facing SVG %s", (_direction, destination, expected) => {
    expect(planeRotationDeg({ x: 0, y: 0 }, destination)).toBeCloseTo(expected, 8);
  });

  it("stays aligned with the destination throughout a projected UK route", () => {
    // Leaflet EPSG:3857 world-pixel coordinates at zoom zero: Newquay to Edinburgh.
    const from = { x: 124.44178488888889, y: 86.3242312373913 };
    const to = { x: 125.606976, y: 79.78277375826065 };
    const rotation = planeRotationDeg(from, to);
    for (const progress of [0, 0.25, 0.5, 0.75, 0.99]) {
      const position = interpolateProjectedRoute(from, to, progress);
      expect(planeRotationDeg(position, to)).toBeCloseTo(rotation, 8);
      const radians = (rotation - 45) * Math.PI / 180;
      const distance = Math.hypot(to.x - position.x, to.y - position.y);
      expect(Math.cos(radians)).toBeCloseTo((to.x - position.x) / distance, 8);
      expect(Math.sin(radians)).toBeCloseTo((to.y - position.y) / distance, 8);
    }
  });

  it("keeps its heading when the map is zoomed or resized", () => {
    const from = { x: 124.4, y: 86.3 };
    const to = { x: 125.6, y: 79.8 };
    for (const scale of [2 ** 4.9, 2 ** 5.4, 2 ** 5.9, 2 ** 7]) {
      const screenFrom = { x: from.x * scale - 200, y: from.y * scale - 100 };
      const screenTo = { x: to.x * scale - 200, y: to.y * scale - 100 };
      expect(planeRotationDeg(screenFrom, screenTo)).toBeCloseTo(planeRotationDeg(from, to), 8);
    }
  });

  it("uses the reverse heading on the return leg", () => {
    const from = { x: 3, y: 5 };
    const to = { x: 8, y: 1 };
    const difference = Math.abs(planeRotationDeg(from, to) - planeRotationDeg(to, from));
    expect(difference).toBeCloseTo(180, 8);
  });

  it("clamps positions to the route endpoints and handles coincident airports", () => {
    const from = { x: 3, y: 5 };
    const to = { x: 8, y: 1 };
    expect(interpolateProjectedRoute(from, to, -1)).toEqual(from);
    expect(interpolateProjectedRoute(from, to, 2)).toEqual(to);
    expect(interpolateProjectedRoute(from, to, 0.5)).toEqual({ x: 5.5, y: 3 });
    expect(interpolateProjectedRoute(from, from, 0.5)).toEqual(from);
    expect(planeRotationDeg(from, from)).toBe(0);
  });
});

describe("subpixel flight positioning", () => {
  it("preserves fractional pixels on both axes", () => {
    const map = {
      project: () => ({ x: 123.125, y: 456.875 } as Point),
      getPixelOrigin: () => ({ x: 100, y: 400 } as Point),
    };
    expect(projectFlightLayerPoint(map, [54, -3])).toEqual({ x: 23.125, y: 56.875 });
  });

  it("keeps consecutive slow-motion frames on the same diagonal at every zoom", () => {
    const from = { x: 124.44178488888889, y: 86.3242312373913 };
    const to = { x: 125.606976, y: 79.78277375826065 };
    for (const zoom of [4.9, 5.4, 6, 9]) {
      const scale = 2 ** zoom;
      const origin = { x: 300, y: 200 };
      const screenFrom = { x: from.x * scale - origin.x, y: from.y * scale - origin.y };
      const screenTo = { x: to.x * scale - origin.x, y: to.y * scale - origin.y };
      const dx = screenTo.x - screenFrom.x;
      const dy = screenTo.y - screenFrom.y;
      let previous: { x: number; y: number } | undefined;
      for (let frame = 0; frame < 120; frame++) {
        const point = interpolateProjectedRoute(from, to, 0.4 + frame / 120_000);
        const screen = projectFlightLayerPoint({
          project: () => ({ x: point.x * scale, y: point.y * scale } as Point),
          getPixelOrigin: () => origin as Point,
        }, [54, -3]);
        const perpendicularError = ((screen.x - screenFrom.x) * dy - (screen.y - screenFrom.y) * dx) / Math.hypot(dx, dy);
        expect(perpendicularError).toBeCloseTo(0, 9);
        if (previous) {
          expect(screen.x).toBeGreaterThan(previous.x);
          expect(screen.y).toBeLessThan(previous.y);
          expect(screen.x - previous.x).toBeLessThan(1);
        }
        previous = screen;
      }
    }
  });
});
