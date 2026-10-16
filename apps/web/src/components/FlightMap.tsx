import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { io } from "socket.io-client";
import { computeMapProgress, interpolateProjectedRoute, planeRotationDeg, projectFlightLayerPoint } from "../lib/flight-map-geometry";
import { createFlightRoute, type FlightRoute } from "../lib/flight-map-route";
import { zoomSelectedFlight } from "../lib/flight-map-zoom";
import { MapDetails, type LiveMapFlight, type MapAirport, type MapSelection } from "./map-details";
import "./flight-map.css";

export type { LiveMapFlight } from "./map-details";

type Tracked = {
  marker: L.Marker;
  flight: LiveMapFlight;
  from: L.LatLngTuple;
  to: L.LatLngTuple;
  projectedFrom: L.Point;
  projectedTo: L.Point;
  depTime: number;
  arrTime: number;
  route: FlightRoute | null;
  selected: boolean;
};

const PLANE_MARKUP = '<img src="/img/plane.svg" width="18" height="18" alt="" />';
const NETWORK_BOUNDS: L.LatLngBoundsExpression = [[49.9, -8.2], [58.7, 1.9]];

function flightKey(flight: LiveMapFlight): string {
  return flight.id ?? `${flight.flightNumber}/${flight.departureTime}/${flight.from.code}/${flight.to.code}`;
}

function fitNetworkView(map: L.Map, animate = false): void {
  map.invalidateSize({ pan: false });
  map.fitBounds(NETWORK_BOUNDS, { padding: [16, 20], animate });
}

function removeRouteLines(t: Tracked): void {
  t.route?.remove();
  t.route = null;
}

function positionFlightMarker(map: L.Map, marker: L.Marker, position: L.LatLng): void {
  marker.setLatLng(position);
  const element = marker.getElement();
  if (!element) return;
  const point = projectFlightLayerPoint(map, position);
  L.DomUtil.setPosition(element, L.point(point.x, point.y));
}

function openRouteLines(map: L.Map, t: Tracked, progress: number): void {
  removeRouteLines(t);
  const point = interpolateProjectedRoute(t.projectedFrom, t.projectedTo, progress);
  const position = map.unproject(L.point(point.x, point.y), 0);
  t.route = createFlightRoute(map, t.from, t.to, position);
  t.marker.setZIndexOffset(1000);
}

const UK_BOUNDS: L.LatLngBoundsExpression = [
  [49.5, -11],
  [61.5, 2.5],
];

function isFlightVisible(now: number, depTime: number, arrTime: number): boolean {
  return now >= depTime - 2 * 60 * 1000 && now <= arrTime + 3 * 60 * 1000;
}

export function FlightMap({ apiBaseUrl }: { apiBaseUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trackedRef = useRef<Map<string, Tracked>>(new Map());
  const selectedKeyRef = useRef<string | null>(null);
  const selectedAirportRef = useRef<L.CircleMarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [airports, setAirports] = useState<ReadonlyMap<string, MapAirport>>(new Map());
  const scope = import.meta.env.PROD ? "active" : "demo";

  const clearSelection = useCallback(() => {
    const tracked = selectedKeyRef.current ? trackedRef.current.get(selectedKeyRef.current) : undefined;
    if (tracked) {
      tracked.selected = false;
      tracked.marker.getElement()?.classList.remove("is-selected");
      tracked.marker.setZIndexOffset(0);
      removeRouteLines(tracked);
    }
    selectedAirportRef.current?.setStyle({ radius: 5, weight: 1, fillOpacity: 0.85 });
    selectedAirportRef.current = null;
    selectedKeyRef.current = null;
    setSelection(null);
  }, []);

  const dismissDetails = useCallback(() => {
    const target = selectedKeyRef.current
      ? trackedRef.current.get(selectedKeyRef.current)?.marker.getElement()
      : selectedAirportRef.current?.getElement();
    clearSelection();
    if (target instanceof HTMLElement || target instanceof SVGElement) target.focus({ preventScroll: true });
  }, [clearSelection]);

  const clearTracked = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const t of trackedRef.current.values()) {
      removeRouteLines(t);
      if (map.hasLayer(t.marker)) map.removeLayer(t.marker);
    }
    trackedRef.current.clear();
  }, []);

  const applyFlights = useCallback(
    (data: LiveMapFlight[]) => {
      const map = mapRef.current;
      if (!map) return;

      const now = Date.now();
      const seen = new Set<string>();

      for (const flight of data) {
        const key = flightKey(flight);
        const from: L.LatLngTuple = [flight.from.lat, flight.from.lon];
        const to: L.LatLngTuple = [flight.to.lat, flight.to.lon];
        const projectedFrom = map.project(from, 0);
        const projectedTo = map.project(to, 0);
        const correctedAngle = planeRotationDeg(projectedFrom, projectedTo);
        const depTime = new Date(flight.departureTime).getTime();
        const arrTime = new Date(flight.arrivalTime).getTime();
        if (scope === "active" && !isFlightVisible(now, depTime, arrTime)) continue;
        seen.add(key);
        const existing = trackedRef.current.get(key);
        if (existing) {
          const routeChanged = existing.from[0] !== from[0] || existing.from[1] !== from[1] ||
            existing.to[0] !== to[0] || existing.to[1] !== to[1];
          existing.flight = flight;
          existing.depTime = depTime;
          existing.arrTime = arrTime;
          existing.from = from;
          existing.to = to;
          existing.projectedFrom = projectedFrom;
          existing.projectedTo = projectedTo;
          if (routeChanged) {
            const plane = existing.marker.getElement()?.querySelector<HTMLElement>(".rotated-icon");
            if (plane) plane.style.transform = `rotate(${correctedAngle}deg)`;
            if (existing.selected) openRouteLines(map, existing, computeMapProgress(existing, key, scope, now));
          }
          if (existing.selected) setSelection({ kind: "flight", flight });
          continue;
        }

        const icon = L.divIcon({
          className: "plane-icon",
          html: `<div class="plane-marker"><div class="rotated-icon" style="transform: rotate(${correctedAngle}deg);">${PLANE_MARKUP}</div></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const initialProgress = computeMapProgress({ depTime, arrTime }, key, scope, now);
        const start = interpolateProjectedRoute(projectedFrom, projectedTo, initialProgress);
        const startPosition = map.unproject(L.point(start.x, start.y), 0);

        const marker = L.marker(startPosition, { icon, title: `${flight.flightNumber}: ${flight.from.code} to ${flight.to.code}`, alt: `${flight.flightNumber} flight`, autoPanOnFocus: false, bubblingMouseEvents: false }).addTo(map);
        positionFlightMarker(map, marker, startPosition);
        const tracked: Tracked = {
          marker,
          flight,
          from,
          to,
          projectedFrom,
          projectedTo,
          depTime,
          arrTime,
          route: null,
          selected: false,
        };

        marker.on("click", () => {
          clearSelection();
          tracked.selected = true;
          selectedKeyRef.current = key;
          marker.getElement()?.classList.add("is-selected");
          const progress = computeMapProgress(tracked, key, scope, Date.now());
          openRouteLines(map, tracked, progress);
          setSelection({ kind: "flight", flight: tracked.flight });
        });

        trackedRef.current.set(key, tracked);
      }
      for (const [key, tracked] of trackedRef.current.entries()) {
        if (seen.has(key)) continue;
        if (selectedKeyRef.current === key) clearSelection();
        removeRouteLines(tracked);
        tracked.marker.remove();
        trackedRef.current.delete(key);
      }
    },
    [clearSelection, scope],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (mapRef.current) {
      const existing = mapRef.current.getContainer();
      if (existing !== el) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
    if (mapRef.current) return;

    const map = L.map(el, {
      center: [54.5, -3],
      zoom: 6,
      minZoom: 4,
      maxZoom: 15,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      zoomControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: true,
      dragging: true,
      maxBounds: UK_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.zoomControl.setPosition("topright");
    const zoomControls = map.zoomControl.getContainer();
    const zoomOnSelectedFlight = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest(".leaflet-control-zoom-in, .leaflet-control-zoom-out");
      if (!button) return;
      const tracked = selectedKeyRef.current ? trackedRef.current.get(selectedKeyRef.current) : undefined;
      if (!tracked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      zoomSelectedFlight(map, tracked.marker.getLatLng(), button.classList.contains("leaflet-control-zoom-in") ? 1 : -1, event.shiftKey);
    };
    zoomControls?.addEventListener("click", zoomOnSelectedFlight, true);

    mapRef.current = map;
    const routePane = map.createPane("flight-routes");
    routePane.style.zIndex = "350";
    routePane.style.pointerEvents = "none";
    map.on("click", clearSelection);
    let zooming = false;
    const pauseFlightMotion = () => { zooming = true; };
    const resumeFlightMotion = () => { zooming = false; };
    map.on("zoomstart", pauseFlightMotion);
    map.on("zoomend", resumeFlightMotion);

    let resizeFrame: number | null = null;
    const fitOnResize = () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (mapRef.current === map) fitNetworkView(map);
      });
    };
    fitOnResize();
    const resizeObserver = new ResizeObserver(fitOnResize);
    resizeObserver.observe(el);

    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/airports`);
        if (!res.ok) throw new Error("Airport data unavailable");
        const airports = (await res.json()) as MapAirport[];
        if (mapRef.current !== map) return;
        setAirports(new Map(airports.map((airport) => [airport.code, airport])));
        for (const a of airports) {
          const lat = Number(a.latitude);
          const lon = Number(a.longitude);
          if (a.latitude === null || a.longitude === null || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          const airportMarker = L.circleMarker([lat, lon], {
            className: "ne-airport-marker",
            bubblingMouseEvents: false,
            radius: 5,
            color: "#ffffff",
            fillColor: "#b51f36",
            fillOpacity: 0.85,
            weight: 1,
          }).addTo(map);
          const selectAirport = () => {
            clearSelection();
            selectedAirportRef.current = airportMarker;
            airportMarker.setStyle({ radius: 7, weight: 2, fillOpacity: 1 });
            setSelection({ kind: "airport", airport: a });
          };
          airportMarker.on("click", selectAirport);
          const target = airportMarker.getElement();
          if (target) {
            target.setAttribute("tabindex", "0");
            target.setAttribute("role", "button");
            target.setAttribute("aria-label", `${a.name} (${a.code}) airport details`);
            target.addEventListener("keydown", (event) => {
              if (!(event instanceof KeyboardEvent)) return;
              const key = event.key;
              if (key !== "Enter" && key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              selectAirport();
            });
          }
        }
      } catch {
        /* ignore */
      }
    })();

    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/flights/live?scope=${scope}`);
        if (!res.ok) throw new Error("Flight data unavailable");
        const data = (await res.json()) as LiveMapFlight[];
        applyFlights(data);
        setLoadError(false);
        map.invalidateSize();
      } catch (err) {
        setLoadError(true);
        console.error("FlightMap: failed to load live flights", err);
      }
    })();

    const socket = io(apiBaseUrl, { transports: ["websocket"] });
    socket.on("flightUpdate", (payload: unknown) => {
      if (!Array.isArray(payload)) return;
      try {
        applyFlights(payload as LiveMapFlight[]);
        setLoadError(false);
      } catch (err) {
        console.error("FlightMap: failed to apply flight update", err);
      }
    });

    const animate = () => {
      const m = mapRef.current;
      if (!m) return;
      const tNow = Date.now();
      const toDelete: string[] = [];
      for (const [key, t] of trackedRef.current.entries()) {
        const { marker, projectedFrom, projectedTo } = t;
        const progress = computeMapProgress(t, key, scope, tNow);
        const point = interpolateProjectedRoute(projectedFrom, projectedTo, progress);
        const position = m.unproject(L.point(point.x, point.y), 0);
        // Let Leaflet transform its layers together during zoom animations.
        if (!zooming) {
          if (m.hasLayer(marker)) positionFlightMarker(m, marker, position);
          t.route?.update(position);
        }

        if (scope === "active" && tNow > t.arrTime + 3 * 60 * 1000) {
          if (selectedKeyRef.current === key) clearSelection();
          removeRouteLines(t);
          if (m.hasLayer(marker)) m.removeLayer(marker);
          toDelete.push(key);
        }
      }
      for (const key of toDelete) trackedRef.current.delete(key);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      map.off("click", clearSelection);
      map.off("zoomstart", pauseFlightMotion);
      map.off("zoomend", resumeFlightMotion);
      zoomControls?.removeEventListener("click", zoomOnSelectedFlight, true);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      socket.disconnect();
      clearSelection();
      clearTracked();
      map.remove();
      mapRef.current = null;
    };
  }, [apiBaseUrl, applyFlights, clearSelection, clearTracked, scope]);

  return (
    <div id="flight-tracker-container" className={`flight-tracker-wrap${selection ? " has-map-selection" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); dismissDetails(); } }}>
      <div ref={containerRef} id="flight-tracker-map" className="flight-tracker-map" aria-label="Interactive map of UK airports and flights" />
      <button className="icon-button map-reset" aria-label="Reset map to UK network" title="Reset map to UK network" onClick={() => { if (mapRef.current) fitNetworkView(mapRef.current, true); }}><LocateFixed size={17} /></button>
      {selection && <MapDetails selection={selection} airports={airports} scope={scope} onClose={dismissDetails} />}
      {loadError && <span className="map-feedback" role="status">Flight positions are temporarily unavailable.</span>}
    </div>
  );
}
