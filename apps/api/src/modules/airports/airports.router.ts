import { Router } from "express";
import { listAirports } from "./airports.service.js";

export const airportsRouter = Router();

airportsRouter.get("/", (_req, res, next) => {
  void (async () => {
    try {
      const rows = await listAirports();
      res.json(
        rows.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          city: a.city,
          country: a.country,
          latitude: a.latitude,
          longitude: a.longitude,
        })),
      );
    } catch (err) {
      next(err);
    }
  })();
});
