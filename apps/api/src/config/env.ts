import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1).optional(),
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((value) =>
        value
          ? value
              .split(",")
              .map((origin) => origin.trim())
              .filter(Boolean)
          : [],
      ),
    JWT_SECRET: z.string().min(32).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "test") return;
    if (!data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL is required",
        path: ["DATABASE_URL"],
      });
    }
    if (data.NODE_ENV === "production" && !data.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET is required in production",
        path: ["JWT_SECRET"],
      });
    }
  });

export type Env = z.infer<typeof envSchema> & { JWT_SECRET: string };

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(message)}`);
  }
  const data = parsed.data;
  const jwtSecret =
    data.JWT_SECRET ??
    (data.NODE_ENV === "test"
      ? "test-jwt-secret-must-be-at-least-32-chars!!"
      : "development-only-jwt-secret-must-be-32-chars!!");

  return { ...data, JWT_SECRET: jwtSecret };
}
