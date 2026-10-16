import { z } from "zod";

export const createScheduleBodySchema = z.object({
  flightId: z.string().uuid(),
  scheduledDeparture: z.string().min(1),
  scheduledArrival: z.string().min(1),
  flightPlanOrigin: z.string().optional(),
  flightPlanDestination: z.string().optional(),
  terminal: z.string().optional(),
  gate: z.string().optional(),
  status: z.string().optional(),
});

export const updateScheduleStatusSchema = z.object({
  status: z.enum(["Scheduled", "Boarding", "Delayed", "Landed", "Cancelled"]),
});
