import "dotenv/config";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sequelize } from "sequelize";
import { loadEnv } from "../src/config/env.js";
import { createSequelize } from "../src/db/index.js";
import { createApp } from "../src/http/createApp.js";
import { initModels } from "../src/models/index.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("GET /api/airports", () => {
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

  it("returns a non-empty list ordered by code", async () => {
    const res = await request(app).get("/api/airports");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const codes = res.body.map((row: { code: string }) => row.code);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });
});
