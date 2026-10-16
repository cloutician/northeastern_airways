import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEnv, type Env } from "../src/config/env.js";
import { createApp } from "../src/http/createApp.js";

const baseEnv: Env = {
  NODE_ENV: "test", PORT: 3000, CORS_ORIGINS: [],
  JWT_SECRET: "demo-payment-tests-only-not-a-real-secret-123",
};

afterEach(() => { vi.unstubAllEnvs(); });

describe("demo-only payment policy without a database or provider", () => {
  it.each(["development", "test", "production"] as const)("exposes only simulated confirmation in %s", async (mode) => {
    const app = createApp({ env: { ...baseEnv, NODE_ENV: mode } });
    const response = await request(app).get("/api/payments");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, mode: "simulated", demoPaymentEnabled: true, collectsCardDetails: false, chargesMoney: false });
  });

  it("ignores legacy Stripe settings rather than activating a payment provider", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://unused:unused@localhost/unused");
    vi.stubEnv("JWT_SECRET", baseEnv.JWT_SECRET);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_not_a_real_key");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_not_a_real_secret");
    const env = loadEnv();
    expect(env).not.toHaveProperty("STRIPE_SECRET_KEY");
    expect(env).not.toHaveProperty("STRIPE_WEBHOOK_SECRET");
    const response = await request(createApp({ env })).get("/api/payments");
    expect(response.body).toMatchObject({ mode: "simulated", demoPaymentEnabled: true, chargesMoney: false });
  });

  it.each(["development", "test", "production"] as const)("rejects unsigned legacy webhooks before JSON parsing in %s", async (mode) => {
    const response = await request(createApp({ env: { ...baseEnv, NODE_ENV: mode } }))
      .post("/api/payments/webhook").type("application/json").send("{invalid json");
    expect(response.status).toBe(410);
    expect(response.body).toEqual({ error: "real_payments_disabled" });
  });

  it("does not provide a card checkout or payment-intent endpoint", async () => {
    const app = createApp({ env: baseEnv });
    for (const endpoint of ["/api/payments/checkout", "/api/payments/create-payment-intent"]) {
      const response = await request(app).post(endpoint).send({});
      expect(response.status).toBe(404);
    }
  });
});
