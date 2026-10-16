import bcrypt from "bcryptjs";
import type { Env } from "../../config/env.js";
import { User } from "../../models/index.js";
import type { JwtPayload } from "../../types/jwt.js";
import { signAccessToken } from "../../http/middleware/auth.js";
import type { LoginBody, RegisterBody } from "./auth.validation.js";

export async function registerUser(body: RegisterBody): Promise<Record<string, unknown>> {
  const hashed = await bcrypt.hash(body.password, 10);
  const approvalStatus = body.role === "passenger" ? "approved" : "pending";
  const user = await User.create({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email.toLowerCase(),
    password: hashed,
    role: body.role,
    personnelType: body.role === "personnel" ? body.personnelType ?? null : null,
    approvalStatus,
  });
  return sanitizeUser(user);
}

export type LoginResult =
  | { status: "invalid_credentials" }
  | { status: "not_approved" }
  | { status: "ok"; token: string; user: Record<string, unknown> };

export async function loginUser(env: Env, body: LoginBody): Promise<LoginResult> {
  const user = await User.findOne({ where: { email: body.email.toLowerCase() } });
  if (!user) {
    return { status: "invalid_credentials" as const };
  }
  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) {
    return { status: "invalid_credentials" as const };
  }
  if (user.approvalStatus !== "approved") {
    return { status: "not_approved" as const };
  }
  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    personnelType: user.personnelType,
  };
  const token = signAccessToken(env, payload);
  return { status: "ok" as const, token, user: sanitizeUser(user) };
}

export async function getUserProfile(userId: number): Promise<Record<string, unknown> | null> {
  const user = await User.findByPk(userId, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "email",
      "role",
      "personnelType",
      "approvalStatus",
    ],
  });
  return user?.get({ plain: true }) as Record<string, unknown> | null;
}

function sanitizeUser(user: User): Record<string, unknown> {
  const row = user.get({ plain: true }) as Record<string, unknown>;
  delete row.password;
  return row;
}
