import type { LatLng, Map as LeafletMap } from "leaflet";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { zoomSelectedFlight } from "../src/lib/flight-map-zoom";

describe("zoom controls with a selected flight", () => {
  let currentZoom: number;
  let map: LeafletMap;
  const selected = { lat: 53.123, lng: -3.456 } as LatLng;

  beforeEach(() => {
    currentZoom = 6;
    map = {
      options: { zoomDelta: 0.5 },
      getZoom: vi.fn(() => currentZoom),
      getMinZoom: vi.fn(() => 4),
      getMaxZoom: vi.fn(() => 15),
      setView: vi.fn((_center: LatLng, zoom: number) => { currentZoom = zoom; }),
    } as unknown as LeafletMap;
  });

  it("leaves normal zoom behavior alone without a selected flight", () => {
    expect(zoomSelectedFlight(map, null, 1)).toBe(false);
    expect(map.setView).not.toHaveBeenCalled();
    expect(map.getZoom).not.toHaveBeenCalled();
  });

  it.each([[1, 6.5], [-1, 5.5]] as const)("centers the selected flight when zooming in direction %s", (direction, zoom) => {
    expect(zoomSelectedFlight(map, selected, direction)).toBe(true);
    expect(map.setView).toHaveBeenCalledOnce();
    expect(map.setView).toHaveBeenCalledWith(selected, zoom, { animate: true });
  });

  it("preserves the native Shift-click larger step", () => {
    zoomSelectedFlight(map, selected, 1, true);
    expect(map.setView).toHaveBeenCalledWith(selected, 7.5, { animate: true });
  });

  it("uses the standard one-level fallback if no zoom delta is configured", () => {
    map.options.zoomDelta = undefined;
    zoomSelectedFlight(map, selected, -1);
    expect(map.setView).toHaveBeenCalledWith(selected, 5, { animate: true });
  });

  it.each([[15, 1], [4, -1]] as const)("does not pan or exceed the zoom limit at %s", (zoom, direction) => {
    currentZoom = zoom;
    expect(zoomSelectedFlight(map, selected, direction)).toBe(true);
    expect(map.setView).not.toHaveBeenCalled();
  });

  it("uses the moving plane's latest position on each click", () => {
    zoomSelectedFlight(map, selected, 1);
    const moved = { lat: 53.126, lng: -3.451 } as LatLng;
    zoomSelectedFlight(map, moved, 1);
    expect(map.setView).toHaveBeenLastCalledWith(moved, 7, { animate: true });
  });
});
