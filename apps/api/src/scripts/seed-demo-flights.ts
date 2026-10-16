import "dotenv/config";
import { loadEnv } from "../config/env.js";
import { createSequelize } from "../db/index.js";
import seedFlightSchedule from "../db/seed-flight-schedule.cjs";

async function main() {
  const env = loadEnv();
  if (env.NODE_ENV === "production") throw new Error("Demo schedule refresh is disabled in production");
  const sequelize = createSequelize({ ...env, NODE_ENV: "test" });
  try {
    const result = await seedFlightSchedule(sequelize.getQueryInterface());
    console.log(`Schedule coverage: ${result.startDate} to ${result.endDate} (UK dates).`);
    console.log(`Added ${result.addedFlights} flights and ${result.addedSchedules} schedule entries. Existing records were preserved.`);
  } finally {
    await sequelize.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "Schedule refresh failed");
  process.exitCode = 1;
});
