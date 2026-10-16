import { z } from "zod";

export const quoteBookingBodySchema = z.object({
  flightIds: z.array(z.string().uuid()).min(1).max(8).refine(
    (ids) => new Set(ids).size === ids.length,
    "Each flight may only appear once",
  ),
});

export const createBookingBodySchema = quoteBookingBodySchema.extend({
  seatAssignments: z
    .array(
      z.object({
        flightId: z.string().uuid(),
        seatId: z.string().uuid(),
      }),
    )
    .optional(),
});

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export const confirmDemoBookingBodySchema = z.object({}).strict();
