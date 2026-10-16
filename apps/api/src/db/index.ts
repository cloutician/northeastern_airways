import { Sequelize } from "sequelize";
import type { Env } from "../config/env.js";

export function createSequelize(env: Env): Sequelize {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Sequelize(url, {
    logging: env.NODE_ENV === "development" ? console.log : false,
  });
}
