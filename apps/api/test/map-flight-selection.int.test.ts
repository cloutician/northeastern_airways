import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sequelize } from "sequelize";
import { loadEnv } from "../src/config/env.js";
import { createSequelize } from "../src/db/index.js";
import { Aircraft, Flight, Path, initModels } from "../src/models/index.js";
import { listLiveMapFlights } from "../src/modules/flights/flights.service.js";

describe.skipIf(!process.env.DATABASE_URL)("Database flights selected for the map", () => {
  let sequelize: Sequelize;
  const now = new Date("2030-07-01T12:00:00Z");
  const flights: Flight[] = [];

  beforeAll(async () => {
    sequelize = createSequelize({ ...loadEnv(), NODE_ENV: "test" });
    initModels(sequelize);
    const path = await Path.findOne();
    const aircraft = await Aircraft.findOne();
    if (!path || !aircraft) throw new Error("Seed paths and aircraft before running map tests");
    for (const [departureOffset, arrivalOffset] of [[-40, -2], [-10, 10], [1, 21], [45, 65], [1440, 1460], [31 * 1440, 31 * 1440 + 20]]) {
      const departureTime = new Date(now.getTime() + departureOffset * 60000);
      const flight = await Flight.create({
        flightNumber: `MAP-${randomUUID()}`, pathId: path.id, aircraftId: aircraft.id, cost: "15.00",
        date: departureTime.toISOString().slice(0, 10), departureTime,
        arrivalTime: new Date(now.getTime() + arrivalOffset * 60000),
      });
      flights.push(flight);
    }
  });
  afterAll(async () => {
    for (const flight of flights) await flight.destroy();
    await sequelize?.close();
  });

  it("shows only in-flight or immediately adjacent flights in active mode", async () => {
    const result = await listLiveMapFlights("active", now);
    expect(result.map((flight) => flight.id).sort()).toEqual(flights.slice(0, 3).map((flight) => flight.id).sort());
  });
  it("prefers currently airborne database records for demo replay", async () => {
    const result = await listLiveMapFlights("demo", now);
    expect(result.map((flight) => flight.id)).toEqual([flights[1].id]);
  });
  it("falls back to nearby departures instead of the furthest future date", async () => {
    const clock = new Date(now.getTime() + 30 * 60000);
    const result = await listLiveMapFlights("demo", clock);
    expect(result[0].id).toBe(flights[3].id);
    expect(result.some((flight) => flight.id === flights[5].id)).toBe(false);
    for (const flight of result) {
      expect(Date.parse(flight.departureTime)).toBeGreaterThanOrEqual(clock.getTime());
      expect(Date.parse(flight.departureTime)).toBeLessThanOrEqual(clock.getTime() + 86400000);
    }
  });
});
