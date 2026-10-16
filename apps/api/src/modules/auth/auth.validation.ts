import { z } from "zod";

const roleEnum = z.enum(["passenger", "personnel", "administrator"]);

export const registerBodySchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    role: roleEnum,
    personnelType: z.enum(["technical", "non-technical"]).optional(),
  })
  .refine((data) => data.role !== "administrator", {
    message: "Cannot self-register as administrator",
    path: ["role"],
  });

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
