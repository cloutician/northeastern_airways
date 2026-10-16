"use strict";

const { QueryTypes } = require("sequelize");

/** Append a rolling demo timetable. Existing flights, schedules and bookings are never changed. */
async function seedFlightSchedule(queryInterface, options = {}) {
  const days = options.days ?? 30;
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error("Schedule days must be an integer between 1 and 90");
  }
  const now = options.now ?? new Date();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("Invalid schedule date");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const startDate = `${parts.year}-${parts.month}-${parts.day}`;
  const endDate = new Date(Date.parse(`${startDate}T00:00:00Z`) + (days - 1) * 86400000).toISOString().slice(0, 10);
  const sequelize = queryInterface.sequelize;

  const seed = async (transaction) => {
    // Serialize refreshes so two invocations cannot insert the same missing path/date.
    await sequelize.query("SELECT pg_advisory_xact_lock(20301016, 1)", { transaction });
    const aircraft = await sequelize.query(
      `SELECT id FROM "Aircraft" ORDER BY CASE WHEN id = '11111111-1111-4111-8111-111111111111'::uuid THEN 0 ELSE 1 END, id LIMIT 1`,
      { type: QueryTypes.SELECT, transaction },
    );
    const paths = await sequelize.query('SELECT id FROM "Paths" LIMIT 1', { type: QueryTypes.SELECT, transaction });
    if (!aircraft.length || !paths.length) throw new Error("Seed airports, paths and aircraft before refreshing flights");
    const replacements = { startDate, endDate, aircraftId: aircraft[0].id };

    const flights = await sequelize.query(`
      WITH plans AS (
        SELECT p.id AS path_id, d.day::date AS flight_date,
          (slot.hour * 60 + MOD(p.id * 17, 180)) AS departure_minutes,
          GREATEST(15, CEIL(p.distance / 10.5 * 1.02))::int AS duration_minutes,
          ROUND((p.distance * 0.12)::numeric, 2) AS cost,
          slot.hour
        FROM "Paths" p
        CROSS JOIN generate_series(CAST(:startDate AS date), CAST(:endDate AS date), interval '1 day') d(day)
        CROSS JOIN (VALUES (8), (13), (18)) slot(hour)
        WHERE NOT EXISTS (SELECT 1 FROM "Flights" f WHERE f."pathId" = p.id AND f.date = d.day::date)
      )
      INSERT INTO "Flights" (id, "flightNumber", "pathId", "aircraftId", date, "departureTime", "arrivalTime", cost, "travelTime", "flightTime", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'NE' || path_id || '-' || hour, path_id, CAST(:aircraftId AS uuid), flight_date,
        (flight_date::timestamp + departure_minutes * interval '1 minute') AT TIME ZONE 'Europe/London',
        (flight_date::timestamp + (departure_minutes + duration_minutes) * interval '1 minute') AT TIME ZONE 'Europe/London',
        cost, duration_minutes, duration_minutes, NOW(), NOW()
      FROM plans RETURNING id
    `, { replacements, type: QueryTypes.SELECT, transaction });

    const schedules = await sequelize.query(`
      INSERT INTO "FlightSchedules" (id, "flightId", "scheduledDeparture", "scheduledArrival", "aircraftType", "flightPlanOrigin", "flightPlanDestination", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), f.id, f."departureTime", f."arrivalTime", a.type, origin.code, destination.code, 'Scheduled', NOW(), NOW()
      FROM "Flights" f
      JOIN "Paths" p ON p.id = f."pathId"
      JOIN "Airports" origin ON origin.id = p."fromAirportId"
      JOIN "Airports" destination ON destination.id = p."toAirportId"
      JOIN "Aircraft" a ON a.id = f."aircraftId"
      WHERE f.date BETWEEN CAST(:startDate AS date) AND CAST(:endDate AS date)
        AND f."departureTime" IS NOT NULL AND f."arrivalTime" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "FlightSchedules" s WHERE s."flightId" = f.id)
      RETURNING id
    `, { replacements, type: QueryTypes.SELECT, transaction });

    return { startDate, endDate, addedFlights: flights.length, addedSchedules: schedules.length };
  };

  return options.transaction ? seed(options.transaction) : sequelize.transaction(seed);
}

module.exports = seedFlightSchedule;
