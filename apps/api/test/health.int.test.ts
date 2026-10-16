import request from "supertest";
import { describe, expect, it } from "vitest";
import type { Env } from "../src/config/env.js";
import { createApp } from "../src/http/createApp.js";

const testEnv = {
  NODE_ENV: "test",
  PORT: 0,
  DATABASE_URL: undefined,
  CORS_ORIGINS: [],
  JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
} satisfies Env;

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = createApp({ env: testEnv });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
