import {
  buildRoutingGraph,
  kShortestPaths,
  type DijkstraResult,
  type WeightedEdge,
} from "@northeastern-airways/domain";
import { Op, type WhereOptions } from "sequelize";
import { Airport, Aircraft, Flight, Path } from "../../models/index.js";
import type { FlightSearchBody } from "./flights.validation.js";

const flightPathInclude = {
  model: Path,
  attributes: ["id", "distance"],
  include: [
    { model: Airport, as: "fromAirport" },
    { model: Airport, as: "toAirport" },
  ],
};

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseMoney(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

export async function listFlights(): Promise<Record<string, unknown>[]> {
  const rows = await Flight.findAll({
    include: [{ ...flightPathInclude }, { model: Aircraft }],
    order: [
      ["date", "ASC"],
      ["departureTime", "ASC"],
    ],
  });
  return rows.map((f) => f.get({ plain: true }) as Record<string, unknown>);
}

export type LiveMapFlight = {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  from: { lat: number; lon: number; code: string };
  to: { lat: number; lon: number; code: string };
};

function flightRowToLiveMapFlight(flight: Flight): LiveMapFlight | null {
  const row = flight.get({ plain: true }) as {
    id: string;
    flightNumber: string;
    departureTime: unknown;
    arrivalTime: unknown;
    Path?: {
      fromAirport?: { latitude?: unknown; longitude?: unknown; code?: string };
      toAirport?: { latitude?: unknown; longitude?: unknown; code?: string };
    };
  };

  const path = row.Path;
  if (!path?.fromAirport || !path.toAirport) return null;

  const dep = toDate(row.departureTime);
  const arr = toDate(row.arrivalTime);
  if (!dep || !arr) return null;

  const fromLat = Number(path.fromAirport.latitude ?? NaN);
  const fromLon = Number(path.fromAirport.longitude ?? NaN);
  const toLat = Number(path.toAirport.latitude ?? NaN);
  const toLon = Number(path.toAirport.longitude ?? NaN);
  if ([fromLat, fromLon, toLat, toLon].some((n) => Number.isNaN(n))) return null;

  return {
    id: row.id,
    flightNumber: row.flightNumber,
    departureTime: dep.toISOString(),
    arrivalTime: arr.toISOString(),
    from: {
      lat: fromLat,
      lon: fromLon,
      code: path.fromAirport.code ?? "?",
    },
    to: {
      lat: toLat,
      lon: toLon,
      code: path.toAirport.code ?? "?",
    },
  };
}

/**
 * Flights suitable for the live map / `flightUpdate` socket (see legacy `flight_tracker.ejs`).
 * - `active`: in flight, departing in two minutes, or arrived in the last three minutes.
 * - `demo`: in-flight records, falling back to the next day's departures for replay.
 */
export async function listLiveMapFlights(scope: "active" | "demo", now = new Date()): Promise<LiveMapFlight[]> {
  const limit = scope === "demo" ? 40 : 25;
  let rows = await Flight.findAll({
    where: {
      departureTime: { [Op.lte]: new Date(now.getTime() + (scope === "active" ? 2 * 60000 : 0)) },
      arrivalTime: { [Op.gte]: new Date(now.getTime() - (scope === "active" ? 3 * 60000 : 0)) },
    },
    include: [{ ...flightPathInclude }],
    order: [["departureTime", "ASC"], ["flightNumber", "ASC"], ["id", "ASC"]],
    limit,
  });
  if (scope === "demo" && rows.length === 0) {
    rows = await Flight.findAll({
      where: { departureTime: { [Op.between]: [now, new Date(now.getTime() + 86400000)] } },
      include: [{ ...flightPathInclude }],
      order: [["departureTime", "ASC"], ["flightNumber", "ASC"], ["id", "ASC"]],
      limit,
    });
  }

  const mapped = rows.map((f) => flightRowToLiveMapFlight(f)).filter((x): x is LiveMapFlight => x !== null);
  return mapped;
}

export async function listLiveFlights(params?: { scope?: "active" | "demo" }): Promise<LiveMapFlight[]> {
  const scope = params?.scope === "demo" ? "demo" : "active";
  return listLiveMapFlights(scope);
}

type LegFlight = Record<string, unknown> | null;

function pathDistanceFromFlightPlain(f: LegFlight): number {
  if (!f || typeof f !== "object") return 0;
  if (!("Path" in f)) return 0;
  const pathRow = f.Path;
  if (!pathRow || typeof pathRow !== "object") return 0;
  if (!("distance" in pathRow)) return 0;
  const dist = pathRow.distance;
  return typeof dist === "number" ? dist : 0;
}

export type RouteLeg = {
  fromId: number;
  toId: number;
  flight: LegFlight;
};

export type RouteResult = {
  flights: RouteLeg[];
  totalDistance: number;
  durationMs: number | null;
  routeCost: number;
};

function serializeFlight(flight: Flight): Record<string, unknown> {
  return flight.get({ plain: true }) as Record<string, unknown>;
}

async function buildRouteFromPaths(
  pathResults: DijkstraResult[],
  dateFilter: string | null,
  earliestDeparture?: Date,
): Promise<RouteResult[]> {
  const routeList: RouteResult[] = [];

  for (const result of pathResults) {
    const legs: { from: string; to: string }[] = [];
    for (let i = 0; i < result.path.length - 1; i++) {
      const from = result.path[i];
      const to = result.path[i + 1];
      if (from === undefined || to === undefined) continue;
      legs.push({ from, to });
    }

    const flights: RouteLeg[] = [];
    let previousArrivalTime: Date | null = null;

    for (const leg of legs) {
      const path = await Path.findOne({
        where: {
          fromAirportId: Number(leg.from),
          toAirportId: Number(leg.to),
        },
      });

      if (!path) {
        flights.push({ fromId: Number(leg.from), toId: Number(leg.to), flight: null });
        continue;
      }

      const whereClause: WhereOptions<Flight> = { pathId: path.id };
      if (dateFilter) {
        Object.assign(whereClause, { date: dateFilter });
      }
      if (earliestDeparture) {
        Object.assign(whereClause, { departureTime: { [Op.gte]: earliestDeparture } });
      }

      if (previousArrivalTime) {
        const parsedArrival = new Date(previousArrivalTime);
        if (!Number.isNaN(parsedArrival.getTime())) {
          const bufferMs = 60 * 60 * 1000;
          const minDepartureTime = new Date(Math.max(parsedArrival.getTime() + bufferMs, earliestDeparture?.getTime() ?? 0));
          Object.assign(whereClause, {
            departureTime: { [Op.gte]: minDepartureTime },
          });
        }
      }

      const flight = await Flight.findOne({
        where: whereClause,
        order: [["departureTime", "ASC"]],
        include: [{ ...flightPathInclude }],
      });

      if (flight?.arrivalTime) {
        previousArrivalTime = new Date(flight.arrivalTime);
      }

      flights.push({
        fromId: Number(leg.from),
        toId: Number(leg.to),
        flight: flight ? serializeFlight(flight) : null,
      });
    }

    let firstDeparture: Date | null = null;
    let lastArrival: Date | null = null;
    let routeCost = 0;

    for (const leg of flights) {
      const f = leg.flight;
      if (f?.departureTime && f.arrivalTime) {
        const dep = toDate(f.departureTime);
        const arr = toDate(f.arrivalTime);
        if (!dep || !arr) continue;
        if (!firstDeparture || dep < firstDeparture) firstDeparture = dep;
        if (!lastArrival || arr > lastArrival) lastArrival = arr;
        routeCost += parseMoney(f.cost);
      }
    }

    const totalDistance = flights.reduce((sum, leg) => sum + pathDistanceFromFlightPlain(leg.flight), 0);

    const durationMs =
      firstDeparture && lastArrival ? lastArrival.getTime() - firstDeparture.getTime() : null;

    routeList.push({ flights, totalDistance, durationMs, routeCost });
  }

  return routeList;
}

export async function searchFlights(body: FlightSearchBody) {
  const paths = await Path.findAll({
    attributes: ["fromAirportId", "toAirportId", "distance"],
  });

  const edges: WeightedEdge[] = paths.map((p) => ({
    from: p.fromAirportId,
    to: p.toAirportId,
    weight: p.distance,
  }));

  const graph = buildRoutingGraph(edges);

  const outboundPaths = kShortestPaths(
    graph,
    String(body.fromAirportId),
    String(body.toAirportId),
    3,
  );

  if (!outboundPaths.length) {
    return { status: "no_route" as const };
  }

  const now = new Date();
  const outboundRoutes = await buildRouteFromPaths(outboundPaths, body.departureDate,
    body.departureDate >= now.toISOString().slice(0, 10) ? now : undefined);

  let returnRoutes: RouteResult[] = [];
  if (body.returnDate) {
    const returnPaths = kShortestPaths(
      graph,
      String(body.toAirportId),
      String(body.fromAirportId),
      3,
    );
    if (returnPaths.length > 0) {
      const arrivals = outboundRoutes
        .filter((route) => route.flights.length > 0 && route.flights.every((leg) => leg.flight))
        .map((route) => toDate(route.flights[route.flights.length - 1]?.flight?.arrivalTime)?.getTime())
        .filter((time): time is number => time !== undefined);
      const earliestReturn = arrivals.length ? new Date(Math.min(...arrivals) + 60 * 60 * 1000) : undefined;
      returnRoutes = await buildRouteFromPaths(returnPaths, body.returnDate, earliestReturn);
    }
  }

  const airports = await Airport.findAll({ attributes: ["id", "name", "code"] });
  const airportMap = Object.fromEntries(
    airports.map((a) => [a.id, `${a.name ?? ""} (${a.code})`]),
  );

  return {
    status: "ok" as const,
    outboundRoutes,
    returnRoutes,
    airports: airportMap,
    routes: [...outboundRoutes, ...returnRoutes],
  };
}
