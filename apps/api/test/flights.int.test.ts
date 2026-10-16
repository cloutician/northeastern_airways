import "dotenv/config";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sequelize } from "sequelize";
import { loadEnv } from "../src/config/env.js";
import { createSequelize } from "../src/db/index.js";
import { createApp } from "../src/http/createApp.js";
import { initModels } from "../src/models/index.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!hasDatabase)("Flights API", () => {
  let sequelize: Sequelize;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const env = loadEnv();
    sequelize = createSequelize(env);
    initModels(sequelize);
    await sequelize.authenticate();
    app = createApp({ env });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it("GET /api/flights returns an array", async () => {
    const res = await request(app).get("/api/flights");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/flights/live returns map-ready flights", async () => {
    const res = await request(app).get("/api/flights/live").query({ scope: "demo" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toMatchObject({
        flightNumber: expect.any(String),
        departureTime: expect.any(String),
        arrivalTime: expect.any(String),
        from: { lat: expect.any(Number), lon: expect.any(Number), code: expect.any(String) },
        to: { lat: expect.any(Number), lon: expect.any(Number), code: expect.any(String) },
      });
    }
  });

  it("GET /api/flight-schedules returns an array", async () => {
    const res = await request(app).get("/api/flight-schedules");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/flights/search finds routes for NQY → LHR in the rolling seeded timetable", async () => {
    const airportsRes = await request(app).get("/api/airports");
    expect(airportsRes.status).toBe(200);
    const nqy = airportsRes.body.find((a: { code: string }) => a.code === "NQY");
    const lhr = airportsRes.body.find((a: { code: string }) => a.code === "LHR");
    expect(nqy).toBeTruthy();
    expect(lhr).toBeTruthy();

    const res = await request(app).post("/api/flights/search").send({
      fromAirportId: nqy.id,
      toAirportId: lhr.id,
      departureDate: tomorrow,
    });

    expect(res.status).toBe(200);
    expect(res.body.outboundRoutes).toBeDefined();
    expect(Array.isArray(res.body.outboundRoutes)).toBe(true);
    expect(res.body.outboundRoutes.length).toBeGreaterThan(0);
    expect(res.body.routes.length).toBeGreaterThanOrEqual(res.body.outboundRoutes.length);
    const complete = res.body.outboundRoutes.find((r: { flights: { flight: unknown }[] }) =>
      r.flights.every((leg: { flight: unknown }) => leg.flight !== null),
    );
    expect(complete).toBeDefined();
    expect(complete.totalDistance).toBeGreaterThan(0);
  });

  it("POST /api/flights/search returns 404 when no graph route exists", async () => {
    const res = await request(app).post("/api/flights/search").send({
      fromAirportId: 999999,
      toAirportId: 888888,
      departureDate: tomorrow,
    });
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "no_route" });
  });
});
