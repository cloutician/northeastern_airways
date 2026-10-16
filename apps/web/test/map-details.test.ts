import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getFlightDetails, MapDetails, type LiveMapFlight, type MapAirport, type MapSelection } from "../src/components/map-details";
import { computeMapProgress } from "../src/lib/flight-map-geometry";

const departure = Date.parse("2030-01-10T08:00:00Z");
const arrival = departure + 90 * 60_000;
const flight: LiveMapFlight = {
  id: "flight-123", flightNumber: "NE123-8",
  departureTime: new Date(departure).toISOString(), arrivalTime: new Date(arrival).toISOString(),
  from: { code: "NQY", lat: 50.447, lon: -5.00374 }, to: { code: "EDI", lat: 55.948, lon: -3.36519 },
};
const airport: MapAirport = { code: "NQY", name: "Newquay Cornwall Airport", city: "Newquay", country: "UK", latitude: 50.447, longitude: -5.00374 };
const airports = new Map([
  ["NQY", airport],
  ["EDI", { ...airport, code: "EDI", name: "Edinburgh Airport", city: "Edinburgh" }],
]);
const renderDetails = (selection: MapSelection, scope: "active" | "demo" = "demo") => renderToStaticMarkup(createElement(MapDetails, { selection, airports, scope, onClose: () => {}, now: departure }));

describe("fixed map details panel", () => {
  it("shows only the useful flight details and a dismiss button", () => {
    const html = renderDetails({ kind: "flight", flight });
    for (const text of ["NE123-8", "NQY", "EDI", "Newquay", "Edinburgh", "Departure", "Arrival", "08:00", "09:30", "10 Jan", "1h 30m", "UK time", "Close map details"]) expect(html).toContain(text);
    expect(html).toContain('class="map-details"');
  });

  it("removes the replay percentage, progress bar, and countdown", () => {
    const html = renderDetails({ kind: "flight", flight });
    expect(html).toContain("Demo flight");
    for (const removed of ["progressbar", "aria-valuenow", "replay left", "Replay remaining", "%", "leaflet-popup"]) expect(html).not.toContain(removed);
  });

  it("does not change the demo panel as its plane moves", () => {
    const first = renderDetails({ kind: "flight", flight });
    const later = renderToStaticMarkup(createElement(MapDetails, { selection: { kind: "flight", flight }, airports, scope: "demo", onClose: () => {}, now: arrival + 60_000 }));
    expect(later).toBe(first);
  });

  it("retains flight codes when airport names are unavailable", () => {
    const html = renderToStaticMarkup(createElement(MapDetails, { selection: { kind: "flight", flight }, airports: new Map(), scope: "demo", onClose: () => {} }));
    expect(html).toContain("NQY");
    expect(html).toContain("EDI");
    expect(html).not.toContain("undefined");
  });

  it("escapes database text without injecting HTML", () => {
    const html = renderDetails({ kind: "flight", flight: { ...flight, flightNumber: '<img src=x onerror="alert(1)">' } });
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("shows a compact airport name and location without coordinate clutter", () => {
    const html = renderDetails({ kind: "airport", airport });
    for (const text of ["NQY", "Newquay Cornwall Airport", "Newquay, United Kingdom", "Close map details"]) expect(html).toContain(text);
    expect(html).not.toContain("Latitude");
    expect(html).not.toContain("Longitude");
  });

  it("keeps long airport names intact and safe", () => {
    const html = renderDetails({ kind: "airport", airport: { ...airport, name: 'George Best Belfast City Airport <script>alert("test")</script>', city: undefined, country: undefined } });
    expect(html).toContain("George Best Belfast City Airport &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("undefined");
  });
});

describe("flight timetable details", () => {
  it.each([
    [departure - 1, "Scheduled"], [departure, "En route"], [arrival, "Landed"],
  ] as const)("uses timetable status at %s", (now, status) => {
    expect(getFlightDetails(flight, "active", now).status).toBe(status);
  });

  it("formats summer-time overnight journeys with both dates", () => {
    const details = getFlightDetails({ ...flight, departureTime: "2030-07-31T22:30:00Z", arrivalTime: "2030-08-01T00:30:00Z" }, "active");
    expect(details).toMatchObject({ departure: "23:30", arrival: "01:30", dates: "31 Jul - 1 Aug", duration: "2h" });
  });

  it("formats short journeys without zero hours", () => {
    expect(getFlightDetails({ ...flight, arrivalTime: new Date(departure + 25 * 60_000).toISOString() }, "demo").duration).toBe("25 min");
  });
});

describe("map animation progress", () => {
  it("keeps active markers within their route endpoints", () => {
    const timing = { depTime: departure, arrTime: arrival };
    expect(computeMapProgress(timing, "key", "active", departure - 1)).toBe(0);
    expect(computeMapProgress(timing, "key", "active", arrival + 1)).toBe(1);
    expect(computeMapProgress(timing, "key", "active", departure + 45 * 60_000)).toBe(0.5);
  });

  it("keeps demo movement deterministic without exposing it in the details", () => {
    const timing = { depTime: departure, arrTime: arrival };
    const now = arrival + 60_000;
    const progress = computeMapProgress(timing, "key", "demo", now);
    expect(computeMapProgress(timing, "key", "demo", now)).toBe(progress);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThan(1);
    expect(computeMapProgress({ depTime: arrival, arrTime: departure }, "key", "demo", now)).toBe(1);
  });
});
