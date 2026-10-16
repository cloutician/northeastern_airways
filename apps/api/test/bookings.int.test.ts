import "dotenv/config";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sequelize } from "sequelize";
import { loadEnv, type Env } from "../src/config/env.js";
import { createSequelize } from "../src/db/index.js";
import { createApp } from "../src/http/createApp.js";
import { signAccessToken } from "../src/http/middleware/auth.js";
import { Aircraft, Airport, Booking, Flight, FlightBooking, Path, StripeWebhookEvent, User, initModels } from "../src/models/index.js";

describe.skipIf(!process.env.DATABASE_URL)("Passenger booking lifecycle", () => {
  let sequelize: Sequelize;
  let app: ReturnType<typeof createApp>;
  let env: Env;
  const userIds: number[] = [];
  const flightIds: string[] = [];
  const pathIds: number[] = [];
  const airportIds: number[] = [];
  let owner: string;
  let other: string;
  let outbound: Flight;
  let inbound: Flight;
  let overlap: Flight;
  let departed: Flight;
  let disconnected: Flight;

  beforeAll(async () => {
    env = { ...loadEnv(), NODE_ENV: "test" };
    sequelize = createSequelize(env);
    initModels(sequelize);
    await sequelize.authenticate();
    app = createApp({ env });
    for (let index = 0; index < 2; index++) {
      const user = await User.create({ email: `booking-test-${randomUUID()}@example.test`, password: "test-only", role: "passenger", approvalStatus: "approved" });
      userIds.push(user.id);
    }
    const token = (userId: number) => signAccessToken(env, { userId, role: "passenger", email: "test@example.test", firstName: "Test", personnelType: null });
    owner = token(userIds[0]);
    other = token(userIds[1]);
    const aircraft = await Aircraft.findOne();
    if (!aircraft) throw new Error("Booking integration tests require seeded aircraft");
    const from = await Airport.create({ code: `TEST-${randomUUID()}`, name: "Test origin" });
    airportIds.push(from.id);
    const to = await Airport.create({ code: `TEST-${randomUUID()}`, name: "Test destination" });
    airportIds.push(to.id);
    const path = await Path.create({ fromAirportId: from.id, toAirportId: to.id, distance: 50 });
    pathIds.push(path.id);
    const reverse = await Path.create({ fromAirportId: to.id, toAirportId: from.id, distance: 50 });
    pathIds.push(reverse.id);
    const start = Date.now() + 3 * 86400000;
    const createFlight = async (pathId: number, time: number) => {
      const flight = await Flight.create({
        flightNumber: `TEST-${randomUUID()}`, pathId, aircraftId: aircraft.id,
        date: new Date(time).toISOString().slice(0, 10), cost: "12.34",
        departureTime: new Date(time), arrivalTime: new Date(time + 3600000),
      });
      flightIds.push(flight.id);
      return flight;
    };
    outbound = await createFlight(path.id, start);
    inbound = await createFlight(reverse.id, start + 3 * 3600000);
    overlap = await createFlight(reverse.id, start + 90 * 60000);
    departed = await createFlight(path.id, Date.now() - 86400000);
    disconnected = await createFlight(path.id, start + 6 * 3600000);
  });

  afterAll(async () => {
    // Only remove fixtures owned by this test run.
    for (const userId of userIds) {
      const bookings = await Booking.findAll({ where: { userId } });
      for (const booking of bookings) {
        await FlightBooking.destroy({ where: { BookingId: booking.id } });
        await booking.destroy();
      }
      await User.destroy({ where: { id: userId } });
    }
    for (const id of flightIds) await Flight.destroy({ where: { id } });
    for (const id of pathIds) await Path.destroy({ where: { id } });
    for (const id of airportIds) await Airport.destroy({ where: { id } });
    await sequelize?.close();
  });

  it("quotes, reserves, confirms, lists and cancels a return trip", async () => {
    const selection = { flightIds: [inbound.id, outbound.id], price: 0.01 };
    const quote = await request(app).post("/api/bookings/quote").auth(owner, { type: "bearer" }).send(selection);
    expect(quote.status).toBe(200);
    expect(quote.body.price).toBe(24.68);
    expect(quote.body.flights.map((f: { id: string }) => f.id)).toEqual([outbound.id, inbound.id]);
    expect(quote.body.flights[0].Path.fromAirport.code).toBeTruthy();
    expect(await Booking.count({ where: { userId: userIds[0] } })).toBe(0);
    const created = await request(app).post("/api/bookings").auth(owner, { type: "bearer" }).send(selection);
    expect(created.status).toBe(201);
    const id = created.body.booking.id;
    expect(created.body.booking).toMatchObject({ price: 24.68, bookingStatus: "pending" });
    for (let repeat = 0; repeat < 2; repeat++) {
      const paid = await request(app).post(`/api/bookings/${id}/confirm-payment`).auth(owner, { type: "bearer" });
      expect(paid.status).toBe(200);
      expect(paid.body.simulation).toBe(true);
      expect(paid.body.booking).toMatchObject({ bookingStatus: "confirmed", paymentStatus: "paid" });
      expect(paid.body.booking.stripePaymentIntentId).toBeNull();
    }
    const list = await request(app).get("/api/bookings").auth(owner, { type: "bearer" });
    expect(list.body[0].Flights).toHaveLength(2);
    expect(list.body[0].Flights[0].Path.toAirport.code).toBeTruthy();
    for (let repeat = 0; repeat < 2; repeat++) {
      const cancelled = await request(app).post(`/api/bookings/${id}/cancel`).auth(owner, { type: "bearer" });
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.booking).toMatchObject({ bookingStatus: "cancelled", paymentStatus: "refunded" });
    }
    const repay = await request(app).post(`/api/bookings/${id}/confirm-payment`).auth(owner, { type: "bearer" });
    expect(repay.status).toBe(400);
    expect(repay.body.error).toBe("booking_cancelled");
  });

  it("isolates bookings between passengers", async () => {
    const created = await request(app).post("/api/bookings").auth(owner, { type: "bearer" }).send({ flightIds: [outbound.id] });
    const id = created.body.booking.id;
    expect((await request(app).get(`/api/bookings/${id}`).auth(other, { type: "bearer" })).status).toBe(403);
    for (const action of ["cancel", "confirm-payment"]) {
      expect((await request(app).post(`/api/bookings/${id}/${action}`).auth(other, { type: "bearer" })).status).toBe(403);
    }
    const list = await request(app).get("/api/bookings").auth(other, { type: "bearer" });
    expect(list.body).toEqual([]);
    expect((await request(app).get("/api/bookings")).status).toBe(401);
  });

  it("rejects duplicate, missing and departed flights at quote and reservation", async () => {
    for (const route of ["/api/bookings/quote", "/api/bookings"]) {
      for (const ids of [[outbound.id, outbound.id], [randomUUID()], [departed.id], []]) {
        const response = await request(app).post(route).auth(owner, { type: "bearer" }).send({ flightIds: ids });
        expect(response.status).toBe(400);
      }
    }
  });

  it("rejects overlapping flights and disconnected itineraries", async () => {
    for (const route of ["/api/bookings/quote", "/api/bookings"]) {
      for (const next of [overlap, disconnected]) {
        const response = await request(app).post(route).auth(owner, { type: "bearer" }).send({ flightIds: [outbound.id, next.id] });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("invalid_itinerary");
      }
    }
  });

  it("searches same-day returns after the outbound arrives and quotes the result", async () => {
    const path = await Path.findByPk(outbound.pathId);
    const response = await request(app).post("/api/flights/search").send({
      fromAirportId: path!.fromAirportId, toAirportId: path!.toAirportId,
      departureDate: outbound.date, returnDate: outbound.date,
    });
    expect(response.status).toBe(200);
    const outboundRoute = response.body.outboundRoutes.find((route: { flights: { flight: { id: string } | null }[] }) => route.flights.some((leg) => leg.flight?.id === outbound.id));
    const returnRoute = response.body.returnRoutes.find((route: { flights: { flight: { id: string } | null }[] }) => route.flights.some((leg) => leg.flight?.id === inbound.id));
    expect(outboundRoute).toBeDefined();
    expect(returnRoute).toBeDefined();
    const quote = await request(app).post("/api/bookings/quote").auth(owner, { type: "bearer" }).send({ flightIds: [outboundRoute.flights[0].flight.id, returnRoute.flights[0].flight.id] });
    expect(quote.status).toBe(200);
  });

  it("permits only the owner to confirm a simulation, including in production mode", async () => {
    const production = createApp({ env: { ...env, NODE_ENV: "production" } });
    const created = await request(production).post("/api/bookings").auth(owner, { type: "bearer" }).send({ flightIds: [outbound.id] });
    expect(created.status).toBe(201);
    const id = created.body.booking.id;
    expect((await request(production).post(`/api/bookings/${id}/confirm-payment`)).status).toBe(401);
    expect((await request(production).post(`/api/bookings/${id}/confirm-payment`).auth(other, { type: "bearer" })).status).toBe(403);
    const confirmed = await request(production).post(`/api/bookings/${id}/confirm-payment`).auth(owner, { type: "bearer" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toMatchObject({ simulation: true, booking: { bookingStatus: "confirmed", paymentStatus: "paid", stripePaymentIntentId: null } });
  });

  it("rejects payment details and client-supplied confirmation fields without changing the booking", async () => {
    const created = await request(app).post("/api/bookings").auth(owner, { type: "bearer" }).send({ flightIds: [outbound.id] });
    const id = created.body.booking.id;
    for (const payload of [{ cardNumber: "test-only-not-a-real-card", cvc: "test" }, { paymentMethodId: "test-only" }, { paymentStatus: "paid", price: 0 }]) {
      const response = await request(app).post(`/api/bookings/${id}/confirm-payment`).auth(owner, { type: "bearer" }).send(payload);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "validation_error" });
    }
    const booking = await Booking.findByPk(id);
    expect(booking).toMatchObject({ bookingStatus: "pending", paymentStatus: "pending", stripePaymentIntentId: null });
  });

  it("never processes old webhook messages or modifies booking/event records", async () => {
    const created = await request(app).post("/api/bookings").auth(owner, { type: "bearer" }).send({ flightIds: [outbound.id] });
    const id = created.body.booking.id;
    const eventsBefore = await StripeWebhookEvent.count();
    for (const mode of ["development", "test", "production"] as const) {
      const demoApp = createApp({ env: { ...env, NODE_ENV: mode } });
      const response = await request(demoApp).post("/api/payments/webhook").set("stripe-signature", "t=1,v1=not-a-real-signature").send({
        id: `evt_test_${randomUUID()}`, type: "payment_intent.succeeded",
        data: { object: { id: "pi_test_no_charge", metadata: { bookingId: String(id) } } },
      });
      expect(response.status).toBe(410);
      expect(response.body).toEqual({ error: "real_payments_disabled" });
    }
    expect(await Booking.findByPk(id)).toMatchObject({ bookingStatus: "pending", paymentStatus: "pending", stripePaymentIntentId: null });
    expect(await StripeWebhookEvent.count()).toBe(eventsBefore);
  });
});
