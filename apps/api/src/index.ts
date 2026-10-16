import { createServer } from "node:http";
import "dotenv/config";
import { loadEnv } from "./config/env.js";
import { createSequelize } from "./db/index.js";
import { createApp } from "./http/createApp.js";
import { initModels } from "./models/index.js";
import { startFlightTrackerBroadcast, stopFlightTrackerBroadcast } from "./realtime/flight-tracker-broadcast.js";
import { attachSocketIO, shutdownSocketIO } from "./realtime/io.js";

async function main() {
  const env = loadEnv();
  const sequelize = createSequelize(env);
  initModels(sequelize);
  await sequelize.authenticate();

  const app = createApp({ env });
  const httpServer = createServer(app);
  attachSocketIO(httpServer, env);
  startFlightTrackerBroadcast();

  const server = httpServer.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, closing server and database connections`);
    stopFlightTrackerBroadcast();
    await shutdownSocketIO();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await sequelize.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
