import { Router } from "express";

export function createPaymentsRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      ok: true,
      mode: "simulated",
      demoPaymentEnabled: true,
      collectsCardDetails: false,
      chargesMoney: false,
    });
  });

  return router;
}
