import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { Env } from "../config/env.js";
import { mountRoutes } from "../routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";

export function createApp(params: { env: Env }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());

  const corsOrigin =
    params.env.CORS_ORIGINS.length > 0
      ? params.env.CORS_ORIGINS
      : params.env.NODE_ENV === "development"
        ? true
        : false;

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  // Retire the old integration before body parsing: no event or payment data is processed.
  app.all("/api/payments/webhook", (_req, res) => {
    res.status(410).json({ error: "real_payments_disabled" });
  });

  app.use(express.json());

  mountRoutes(app, { env: params.env });

  const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public");
  app.use(express.static(publicDir, { index: "index.html" }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
