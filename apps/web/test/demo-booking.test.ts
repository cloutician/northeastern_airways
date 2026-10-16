import { describe, expect, it } from "vitest";
import { demoPaymentLabel } from "../src/lib/bookings";

describe("demo booking status wording", () => {
  it.each([
    ["paid", "Demo confirmed"],
    ["refunded", "Demo cancellation recorded"],
    ["pending", "Awaiting demo confirmation"],
    ["unknown", "Awaiting demo confirmation"],
  ])("does not present %s as a real money movement", (status, label) => {
    expect(demoPaymentLabel(status)).toBe(label);
  });

  it("does not ask a cancelled pending booking to be confirmed", () => {
    expect(demoPaymentLabel("pending", "cancelled")).toBe("Demo cancellation recorded");
  });
});
