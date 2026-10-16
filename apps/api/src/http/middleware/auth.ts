import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Env } from "../../config/env.js";
import type { JwtPayload } from "../../types/jwt.js";

export function createRequireAuth(env: Env) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      next();
    } catch {
      res.status(401).json({ error: "invalid_token" });
    }
  };
}

export function signAccessToken(env: Env, payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "24h" });
}
