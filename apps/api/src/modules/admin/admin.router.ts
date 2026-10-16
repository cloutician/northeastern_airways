import { Router } from "express";
import type { Env } from "../../config/env.js";
import { createRequireAuth } from "../../http/middleware/auth.js";
import { requireRole } from "../../http/middleware/rbac.js";
import { approveUser, listPendingUsers, rejectUser } from "./admin.service.js";

export function createAdminRouter(env: Env) {
  const router = Router();
  const requireAuth = createRequireAuth(env);

  router.get(
    "/users/pending",
    requireAuth,
    requireRole("administrator", "view"),
    (_req, res, next) => {
      void (async () => {
        const users = await listPendingUsers();
        res.json(users.map((u) => u.get({ plain: true }) as Record<string, unknown>));
      })().catch(next);
    },
  );

  router.post(
    "/users/:id/approve",
    requireAuth,
    requireRole("administrator", "approve"),
    (req, res, next) => {
      void (async () => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: "invalid_id" });
          return;
        }
        const user = await approveUser(id, req.user!.userId);
        if (!user) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.json({ message: "approved", user: user.get({ plain: true }) as Record<string, unknown> });
      })().catch(next);
    },
  );

  router.post(
    "/users/:id/reject",
    requireAuth,
    requireRole("administrator", "delete"),
    (req, res, next) => {
      void (async () => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: "invalid_id" });
          return;
        }
        const user = await rejectUser(id, req.user!.userId);
        if (!user) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.json({ message: "rejected", user: user.get({ plain: true }) as Record<string, unknown> });
      })().catch(next);
    },
  );

  return router;
}
