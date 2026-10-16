"use strict";

const seedFlightSchedule = require("../db/seed-flight-schedule.cjs");

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === "production") throw new Error("Demo schedule seeding is disabled in production");
    const result = await seedFlightSchedule(queryInterface);
    console.log(`Seeded ${result.addedFlights} flights and ${result.addedSchedules} schedules for ${result.startDate} to ${result.endDate}. Existing records were preserved.`);
  },
  async down() {
    throw new Error("Flight refresh is append-only. Restore a database backup to undo it; existing flights and bookings will not be deleted.");
  },
};
