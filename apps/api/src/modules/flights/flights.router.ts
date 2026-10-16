import { Router } from "express";
import { listFlights, listLiveFlights, searchFlights } from "./flights.service.js";
import { flightSearchBodySchema } from "./flights.validation.js";

export const flightsRouter = Router();

flightsRouter.get("/live", (req, res, next) => {
  void (async () => {
    try {
      const scope = req.query.scope === "demo" ? "demo" : "active";
      res.json(await listLiveFlights({ scope }));
    } catch (err) {
      next(err);
    }
  })();
});

flightsRouter.get("/", (_req, res, next) => {
  void (async () => {
    try {
      res.json(await listFlights());
    } catch (err) {
      next(err);
    }
  })();
});

flightsRouter.post("/search", (req, res, next) => {
  void (async () => {
    try {
      const parsed = flightSearchBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
        return;
      }

      const result = await searchFlights(parsed.data);
      if (result.status === "no_route") {
        res.status(404).json({ error: "no_route" });
        return;
      }

      res.json({
        outboundRoutes: result.outboundRoutes,
        returnRoutes: result.returnRoutes,
        airports: result.airports,
        routes: result.routes,
      });
    } catch (err) {
      next(err);
    }
  })();
});
