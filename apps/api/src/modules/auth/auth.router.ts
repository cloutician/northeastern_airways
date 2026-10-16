import { Router } from "express";
import type { Env } from "../../config/env.js";
import { createRequireAuth } from "../../http/middleware/auth.js";
import { authLoginRateLimiter } from "../../http/middleware/rate-limit.js";
import { getUserProfile, loginUser, registerUser } from "./auth.service.js";
import { loginBodySchema, registerBodySchema } from "./auth.validation.js";

export function createAuthRouter(env: Env) {
  const router = Router();
  const requireAuth = createRequireAuth(env);

  router.post("/register", authLoginRateLimiter, (req, res, next) => {
    void (async () => {
      const parsed = registerBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
        return;
      }
      try {
        const user = await registerUser(parsed.data);
        res.status(201).json({ user });
      } catch (err) {
        if (isUniqueEmailError(err)) {
          res.status(409).json({ error: "email_in_use" });
          return;
        }
        next(err);
      }
    })().catch(next);
  });

  router.post("/login", authLoginRateLimiter, (req, res, next) => {
    void (async () => {
      const parsed = loginBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
        return;
      }
      const result = await loginUser(env, parsed.data);
      if (result.status === "invalid_credentials") {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }
      if (result.status === "not_approved") {
        res.status(403).json({ error: "account_not_approved" });
        return;
      }
      res.json({ token: result.token, user: result.user });
    })().catch(next);
  });

  router.get("/me", requireAuth, (req, res, next) => {
    void (async () => {
      const user = await getUserProfile(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: "user_not_found" });
        return;
      }
      res.json({ user });
    })().catch(next);
  });

  return router;
}

function isUniqueEmailError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  const parent = (err as { parent?: { code?: string } }).parent;
  return name === "SequelizeUniqueConstraintError" || parent?.code === "23505";
}
