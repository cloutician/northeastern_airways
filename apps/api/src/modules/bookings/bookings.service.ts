import { Op, Transaction } from "sequelize";
import { Airport, Booking, Flight, FlightBooking, FlightSeatAssignment, Path, Seat } from "../../models/index.js";

const bookingFlightInclude = {
  model: Flight,
  through: { attributes: [] },
  include: [{ model: Path, include: [
    { model: Airport, as: "fromAirport" },
    { model: Airport, as: "toAirport" },
  ] }],
};

export class BookingServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function validateFlights(flights: Flight[], expectedCount: number) {
  if (!flights.length || flights.length !== expectedCount) {
    throw new BookingServiceError("invalid_flights", "One or more flights not found");
  }
  flights.sort((a, b) => new Date(a.departureTime ?? 0).getTime() - new Date(b.departureTime ?? 0).getTime());
  const paths = await Path.findAll({ where: { id: { [Op.in]: flights.map((f) => f.pathId) } } });
  let priceInPence = 0;
  for (const [index, flight] of flights.entries()) {
    const departure = new Date(flight.departureTime ?? 0).getTime();
    const arrival = new Date(flight.arrivalTime ?? 0).getTime();
    const cost = Number(flight.cost);
    if (!Number.isFinite(departure) || !Number.isFinite(arrival) || arrival <= departure || !Number.isFinite(cost) || cost < 0) {
      throw new BookingServiceError("invalid_flights", "Flight details are incomplete");
    }
    if (departure <= Date.now()) {
      throw new BookingServiceError("flight_departed", "This flight has already departed");
    }
    const path = paths.find((p) => p.id === flight.pathId);
    const previous = flights[index - 1];
    if (!path || (previous && (
      paths.find((p) => p.id === previous.pathId)?.toAirportId !== path.fromAirportId ||
      departure < new Date(previous.arrivalTime!).getTime() + 60 * 60 * 1000
    ))) {
      throw new BookingServiceError("invalid_itinerary", "Flights must connect with at least one hour between them");
    }
    priceInPence += Math.round(cost * 100);
  }
  return priceInPence / 100;
}

export async function quoteBooking(flightIds: string[]) {
  const flights = await Flight.findAll({ where: { id: { [Op.in]: flightIds } } });
  const price = await validateFlights(flights, flightIds.length);
  const details = await Flight.findAll({
    where: { id: { [Op.in]: flightIds } },
    include: bookingFlightInclude.include,
    order: [["departureTime", "ASC"]],
  });
  return { flights: details.map((f) => f.get({ plain: true }) as Record<string, unknown>), price };
}

export async function createBooking(
  userId: number,
  input: { flightIds: string[]; seatAssignments?: { flightId: string; seatId: string }[] },
) {
  const sequelize = Booking.sequelize;
  if (!sequelize) throw new Error("Database not initialized");

  return sequelize.transaction(async (t) => {
    const flights = await Flight.findAll({
      where: { id: { [Op.in]: input.flightIds } },
      transaction: t,
      lock: Transaction.LOCK.UPDATE,
      order: [["id", "ASC"]],
    });
    if (flights.length !== input.flightIds.length) {
      throw new BookingServiceError("invalid_flights", "One or more flights not found");
    }

    const price = await validateFlights(flights, input.flightIds.length);
    const booking = await Booking.create(
      { userId, price, paymentStatus: "pending", bookingStatus: "pending" },
      { transaction: t },
    );

    for (const f of flights) {
      await FlightBooking.create(
        { BookingId: booking.id, FlightId: f.id },
        { transaction: t },
      );
    }

    if (input.seatAssignments?.length) {
      for (const a of input.seatAssignments) {
        const flight = flights.find((f) => f.id === a.flightId);
        if (!flight) {
          throw new BookingServiceError("invalid_seat_route", "Seat assignment flight not in booking");
        }
        const seat = await Seat.findByPk(a.seatId, { transaction: t, lock: Transaction.LOCK.UPDATE });
        if (!seat || seat.aircraftId !== flight.aircraftId) {
          throw new BookingServiceError("invalid_seat", "Seat does not belong to flight aircraft");
        }
        await FlightSeatAssignment.create(
          {
            flightId: a.flightId,
            seatId: a.seatId,
            bookingId: booking.id,
            userId,
            status: "booked",
          },
          { transaction: t },
        );
      }
    }

    return booking;
  });
}

export async function listBookingsForUser(userId: number) {
  return Booking.findAll({
    where: { userId },
    include: [bookingFlightInclude],
    order: [["createdAt", "DESC"]],
  });
}

export async function getBookingById(bookingId: number, userId: number, isAdmin: boolean) {
  const booking = await Booking.findByPk(bookingId, {
    include: [bookingFlightInclude, { model: FlightSeatAssignment, include: [Seat] }],
  });
  if (!booking) return null;
  if (!isAdmin && booking.userId !== userId) {
    return "forbidden" as const;
  }
  return booking;
}

export async function cancelBooking(bookingId: number, userId: number, isAdmin: boolean) {
  const sequelize = Booking.sequelize;
  if (!sequelize) throw new Error("Database not initialized");

  return sequelize.transaction(async (t) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction: t,
      lock: Transaction.LOCK.UPDATE,
    });
    if (!booking) {
      throw new BookingServiceError("not_found", "Booking not found");
    }
    if (!isAdmin && booking.userId !== userId) {
      throw new BookingServiceError("forbidden", "Forbidden");
    }
    if (booking.bookingStatus === "cancelled") {
      return booking;
    }

    const flights = await bookingFlights(bookingId, t);
    if (flights.some((f) => new Date(f.departureTime ?? 0).getTime() <= Date.now())) {
      throw new BookingServiceError("flight_departed", "This trip has already started");
    }

    await FlightSeatAssignment.destroy({ where: { bookingId }, transaction: t });
    await booking.update(
      {
        bookingStatus: "cancelled",
        paymentStatus: booking.paymentStatus === "paid" ? "refunded" : booking.paymentStatus,
        cancellationDate: new Date(),
        cancellationReason: "user_cancelled",
      },
      { transaction: t },
    );
    return booking;
  });
}

export async function confirmDemoBooking(bookingId: number, userId: number) {
  const sequelize = Booking.sequelize;
  if (!sequelize) throw new Error("Database not initialized");

  return sequelize.transaction(async (t) => {
    const booking = await Booking.findByPk(bookingId, { transaction: t, lock: Transaction.LOCK.UPDATE });
    if (!booking) {
      throw new BookingServiceError("not_found", "Booking not found");
    }
    if (booking.userId !== userId) {
      throw new BookingServiceError("forbidden", "Forbidden");
    }
    if (booking.bookingStatus === "cancelled") {
      throw new BookingServiceError("booking_cancelled", "Cancelled bookings cannot be paid");
    }
    if (booking.paymentStatus === "paid" && booking.bookingStatus === "confirmed") return booking;
    const flights = await bookingFlights(bookingId, t);
    await validateFlights(flights, flights.length);
    await booking.update(
      {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
      },
      { transaction: t },
    );
    return booking;
  });
}

async function bookingFlights(bookingId: number, transaction: Transaction) {
  const links = await FlightBooking.findAll({ where: { BookingId: bookingId }, transaction });
  return Flight.findAll({ where: { id: { [Op.in]: links.map((link) => link.FlightId) } }, transaction });
}
