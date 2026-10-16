import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Op, type Sequelize, type Transaction } from "sequelize";
import { loadEnv } from "../src/config/env.js";
import { createSequelize } from "../src/db/index.js";
import seedFlightSchedule from "../src/db/seed-flight-schedule.cjs";
import { Booking, Flight, FlightBooking, FlightSchedule, User, initModels } from "../src/models/index.js";
import { listBoardSchedules } from "../src/modules/personnel/schedules.service.js";

describe.skipIf(!process.env.DATABASE_URL)("Append-only schedule refresh", () => {
  let sequelize: Sequelize;
  let transaction: Transaction;
  const now = new Date("2032-03-27T12:00:00Z");

  beforeAll(async () => {
    sequelize = createSequelize({ ...loadEnv(), NODE_ENV: "test" });
    initModels(sequelize);
    await sequelize.authenticate();
  });
  beforeEach(async () => { transaction = await sequelize.transaction(); });
  afterEach(async () => { await transaction?.rollback(); });
  afterAll(async () => { await sequelize?.close(); });

  it("adds future flights and linked schedules with correct UK daylight-saving times", async () => {
    const result = await seedFlightSchedule(sequelize.getQueryInterface(), { now, days: 3, transaction });
    expect(result).toMatchObject({ startDate: "2032-03-27", endDate: "2032-03-29" });
    expect(result.addedFlights).toBeGreaterThan(0);
    expect(result.addedSchedules).toBeGreaterThanOrEqual(result.addedFlights);
    const flights = await Flight.findAll({
      where: { date: { [Op.between]: [result.startDate, result.endDate] } },
      order: [["pathId", "ASC"], ["date", "ASC"], ["departureTime", "ASC"]], transaction,
    });
    const pathId = flights[0].pathId;
    const first = flights.filter((flight) => flight.pathId === pathId && flight.flightNumber.endsWith("-8"));
    expect(first).toHaveLength(3);
    const localTimes = first.map((flight) => flight.departureTime!.toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
    expect(new Set(localTimes).size).toBe(1);
    expect(first[1].departureTime!.getTime() - first[0].departureTime!.getTime()).toBe(23 * 3600000);
    for (const flight of first) {
      const schedule = await FlightSchedule.findOne({ where: { flightId: flight.id }, transaction });
      expect(schedule?.scheduledDeparture?.getTime()).toBe(flight.departureTime?.getTime());
      expect(schedule?.flightPlanOrigin).toBeTruthy();
      expect(schedule?.flightPlanDestination).toBeTruthy();
    }
  });

  it("is repeatable and preserves existing flights, bookings and staff statuses", async () => {
    const initial = await seedFlightSchedule(sequelize.getQueryInterface(), { now, days: 1, transaction });
    const flight = await Flight.findOne({ where: { date: initial.startDate }, transaction });
    const user = await User.create({ email: `refresh-${randomUUID()}@example.test`, password: "test-only", role: "passenger" }, { transaction });
    const booking = await Booking.create({ userId: user.id, price: 55, bookingStatus: "confirmed", paymentStatus: "paid" }, { transaction });
    await FlightBooking.create({ BookingId: booking.id, FlightId: flight!.id }, { transaction });
    await FlightSchedule.update({ status: "Delayed" }, { where: { flightId: flight!.id }, transaction });
    const repeated = await seedFlightSchedule(sequelize.getQueryInterface(), { now, days: 1, transaction });
    expect(repeated.addedFlights).toBe(0);
    expect(repeated.addedSchedules).toBe(0);
    expect((await Booking.findByPk(booking.id, { transaction }))?.bookingStatus).toBe("confirmed");
    expect((await Flight.findByPk(flight!.id, { transaction }))?.cost).toBe(flight!.cost);
    expect((await FlightSchedule.findOne({ where: { flightId: flight!.id }, transaction }))?.status).toBe("Delayed");
  });

  it("keeps the same local departure time when UK clocks go back", async () => {
    const result = await seedFlightSchedule(sequelize.getQueryInterface(), { now: new Date("2032-10-30T12:00:00Z"), days: 2, transaction });
    const flights = await Flight.findAll({
      where: { date: { [Op.between]: [result.startDate, result.endDate] } },
      order: [["pathId", "ASC"], ["date", "ASC"], ["departureTime", "ASC"]], transaction,
    });
    const morning = flights.filter((flight) => flight.pathId === flights[0].pathId && flight.flightNumber.endsWith("-8"));
    expect(morning).toHaveLength(2);
    expect(morning[1].departureTime!.getTime() - morning[0].departureTime!.getTime()).toBe(25 * 3600000);
    expect(morning[0].departureTime!.toLocaleTimeString("en-GB", { timeZone: "Europe/London" })).toBe(morning[1].departureTime!.toLocaleTimeString("en-GB", { timeZone: "Europe/London" }));
  });

  it("rejects an invalid generation window before writing data", async () => {
    await expect(seedFlightSchedule(sequelize.getQueryInterface(), { days: 0, transaction })).rejects.toThrow("between 1 and 90");
  });

  it("bounds the public board to the next 24 hours", async () => {
    const clock = new Date("2035-01-01T12:00:00Z");
    const flight = await Flight.findOne();
    const fixtures: FlightSchedule[] = [];
    try {
      for (const hours of [-1, 1, 48]) {
        fixtures.push(await FlightSchedule.create({ flightId: flight!.id, scheduledDeparture: new Date(clock.getTime() + hours * 3600000), scheduledArrival: new Date(clock.getTime() + (hours + 1) * 3600000), status: "Scheduled" }));
      }
      const board = await listBoardSchedules(clock);
      expect(board.length).toBeLessThanOrEqual(50);
      expect(board.map((row) => row.id)).toContain(fixtures[1].id);
      expect(board.map((row) => row.id)).not.toContain(fixtures[0].id);
      expect(board.map((row) => row.id)).not.toContain(fixtures[2].id);
      for (const schedule of board) {
        expect(schedule.scheduledDeparture!.getTime()).toBeGreaterThanOrEqual(clock.getTime());
        expect(schedule.scheduledDeparture!.getTime()).toBeLessThanOrEqual(clock.getTime() + 86400000);
      }
    } finally {
      for (const schedule of fixtures) await schedule.destroy();
    }
  });
});
