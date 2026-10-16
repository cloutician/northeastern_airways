import { z } from "zod";

export const flightSearchBodySchema = z
  .object({
    fromAirportId: z.coerce.number().int().positive(),
    toAirportId: z.coerce.number().int().positive(),
    departureDate: z.string().min(1),
    returnDate: z.union([z.string().min(1), z.null()]).optional(),
    passengerInfo: z.string().optional(),
  })
  .refine((data) => data.fromAirportId !== data.toAirportId, {
    message: "fromAirportId and toAirportId must differ",
    path: ["toAirportId"],
  });

export type FlightSearchBody = z.infer<typeof flightSearchBodySchema>;
