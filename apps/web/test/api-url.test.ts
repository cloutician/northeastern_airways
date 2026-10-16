import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("API connection address", () => {
  it.each(["http://localhost:3000", "http://192.168.1.65:3000"])(
    "uses the development proxy instead of exposing %s to the browser",
    async (target) => {
      vi.stubEnv("DEV", true);
      vi.stubEnv("VITE_API_URL", target);
      const { API_URL } = await import("../src/lib/api");
      expect(API_URL).toBe("");
    },
  );

  it("preserves the configured API address in a production build", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    const { API_URL } = await import("../src/lib/api");
    expect(API_URL).toBe("https://api.example.com");
  });

  it("preserves the production fallback when no API address is configured", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_URL", undefined);
    const { API_URL } = await import("../src/lib/api");
    expect(API_URL).toBe("http://localhost:3000");
  });
});
