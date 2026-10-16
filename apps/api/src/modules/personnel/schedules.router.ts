import { Router } from "express";
import type { Env } from "../../config/env.js";
import { createRequireAuth } from "../../http/middleware/auth.js";
import { requireRole, requireTechnicalPersonnel } from "../../http/middleware/rbac.js";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  updateScheduleStatus,
} from "./schedules.service.js";
import { createScheduleBodySchema, updateScheduleStatusSchema } from "./schedules.validation.js";

export function createPersonnelSchedulesRouter(env: Env) {
  const router = Router();
  const requireAuth = createRequireAuth(env);

  router.get(
    "/",
    requireAuth,
    requireRole("personnel", "view"),
    requireTechnicalPersonnel,
    (_req, res, next) => {
      void (async () => {
        const rows = await listSchedules();
        res.json(rows.map((r) => r.get({ plain: true }) as Record<string, unknown>));
      })().catch(next);
    },
  );

  router.post(
    "/",
    requireAuth,
    requireRole("personnel", "create"),
    requireTechnicalPersonnel,
    (req, res, next) => {
      void (async () => {
        const parsed = createScheduleBodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
          return;
        }
        const row = await createSchedule(parsed.data);
        if (!row) {
          res.status(400).json({ error: "invalid_flight" });
          return;
        }
        res.status(201).json({ schedule: row.get({ plain: true }) as Record<string, unknown> });
      })().catch(next);
    },
  );

  router.patch(
    "/:id/status",
    requireAuth,
    requireRole("personnel", "edit"),
    requireTechnicalPersonnel,
    (req, res, next) => {
      void (async () => {
        const parsed = updateScheduleStatusSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
          return;
        }
        const row = await updateScheduleStatus(req.params.id, parsed.data.status);
        if (!row) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.json({ schedule: row.get({ plain: true }) as Record<string, unknown> });
      })().catch(next);
    },
  );

  router.delete(
    "/:id",
    requireAuth,
    requireRole("personnel", "delete"),
    requireTechnicalPersonnel,
    (req, res, next) => {
      void (async () => {
        const ok = await deleteSchedule(req.params.id);
        if (!ok) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.status(204).send();
      })().catch(next);
    },
  );

  return router;
}
