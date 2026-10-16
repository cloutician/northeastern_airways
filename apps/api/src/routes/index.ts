import type { Express } from "express";
import { Router } from "express";
import type { Env } from "../config/env.js";
import { strictRouteRateLimiter } from "../http/middleware/rate-limit.js";
import { createAdminRouter } from "../modules/admin/admin.router.js";
import { airportsRouter } from "../modules/airports/airports.router.js";
import { createAuthRouter } from "../modules/auth/auth.router.js";
import { createBookingsRouter } from "../modules/bookings/bookings.router.js";
import { flightsRouter } from "../modules/flights/flights.router.js";
import { createPaymentsRouter } from "../modules/payments/payments.router.js";
import { createPersonnelSchedulesRouter } from "../modules/personnel/schedules.router.js";
import { listBoardSchedules } from "../modules/personnel/schedules.service.js";

export function mountRoutes(app: Express, ctx: { env: Env }): void {
  const { env } = ctx;

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  /** Public read-only board (matches legacy fullstack `/api/flight-schedules`). */
  app.get("/api/flight-schedules", (_req, res, next) => {
    void (async () => {
      try {
        const rows = await listBoardSchedules();
        res.json(rows.map((r) => r.get({ plain: true }) as Record<string, unknown>));
      } catch (err) {
        next(err);
      }
    })();
  });

  const api = Router();
  api.use("/airports", airportsRouter);
  api.use("/flights", flightsRouter);
  api.use("/auth", createAuthRouter(env));
  api.use("/bookings", createBookingsRouter(env));
  api.use("/admin", createAdminRouter(env));
  api.use("/personnel/schedules", createPersonnelSchedulesRouter(env));
  api.use("/payments", strictRouteRateLimiter, createPaymentsRouter());
  app.use("/api", api);
}
