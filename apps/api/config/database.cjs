const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const shared = {
  dialect: "postgres",
  dialectOptions: {
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
        : false,
  },
};

/** @type {Record<string, import('sequelize').Options>} */
module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    ...shared,
  },
  test: {
    url: process.env.DATABASE_URL,
    ...shared,
  },
  production: {
    url: process.env.DATABASE_URL,
    ...shared,
  },
};
