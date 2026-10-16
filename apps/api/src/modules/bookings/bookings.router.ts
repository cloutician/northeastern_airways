import { Router } from "express";
import type { Env } from "../../config/env.js";
import { createRequireAuth } from "../../http/middleware/auth.js";
import {
  BookingServiceError,
  cancelBooking,
  confirmDemoBooking,
  createBooking,
  getBookingById,
  listBookingsForUser,
  quoteBooking,
} from "./bookings.service.js";
import { confirmDemoBookingBodySchema, createBookingBodySchema, quoteBookingBodySchema } from "./bookings.validation.js";

export function createBookingsRouter(_env: Env) {
  const router = Router();
  const requireAuth = createRequireAuth(_env);

  router.post("/quote", requireAuth, (req, res, next) => {
    void (async () => {
      const parsed = quoteBookingBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "validation_error" });
        return;
      }
      try {
        res.json(await quoteBooking(parsed.data.flightIds));
      } catch (err) {
        if (err instanceof BookingServiceError) {
          res.status(400).json({ error: err.code });
          return;
        }
        throw err;
      }
    })().catch(next);
  });

  router.post("/", requireAuth, (req, res, next) => {
    void (async () => {
      const parsed = createBookingBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
        return;
      }
      try {
        const booking = await createBooking(req.user!.userId, parsed.data);
        res.status(201).json({ booking: booking.get({ plain: true }) as Record<string, unknown> });
      } catch (err) {
        if (err instanceof BookingServiceError) {
          res.status(400).json({ error: err.code });
          return;
        }
        next(err);
      }
    })().catch(next);
  });

  router.get("/", requireAuth, (req, res, next) => {
    void (async () => {
      const rows = await listBookingsForUser(req.user!.userId);
      res.json(rows.map((b) => b.get({ plain: true }) as Record<string, unknown>));
    })().catch(next);
  });

  router.get("/:id", requireAuth, (req, res, next) => {
    void (async () => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }
      const isAdmin = req.user!.role === "administrator";
      const result = await getBookingById(id, req.user!.userId, isAdmin);
      if (result === null) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      res.json({ booking: result.get({ plain: true }) as Record<string, unknown> });
    })().catch(next);
  });

  router.post("/:id/cancel", requireAuth, (req, res, next) => {
    void (async () => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }
      try {
        const isAdmin = req.user!.role === "administrator";
        const booking = await cancelBooking(id, req.user!.userId, isAdmin);
        res.json({ booking: booking.get({ plain: true }) as Record<string, unknown> });
      } catch (err) {
        if (err instanceof BookingServiceError) {
          const status = err.code === "not_found" ? 404 : err.code === "forbidden" ? 403 : 400;
          res.status(status).json({ error: err.code });
          return;
        }
        next(err);
      }
    })().catch(next);
  });

  router.post("/:id/confirm-payment", requireAuth, (req, res, next) => {
    void (async () => {
      if (!confirmDemoBookingBodySchema.safeParse(req.body ?? {}).success) {
        res.status(400).json({ error: "validation_error" });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }
      try {
        const booking = await confirmDemoBooking(id, req.user!.userId);
        res.json({ simulation: true, booking: booking.get({ plain: true }) as Record<string, unknown> });
      } catch (err) {
        if (err instanceof BookingServiceError) {
          const status = err.code === "not_found" ? 404 : err.code === "forbidden" ? 403 : 400;
          res.status(status).json({ error: err.code });
          return;
        }
        next(err);
      }
    })().catch(next);
  });

  return router;
}
