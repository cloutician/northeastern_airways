import type { Sequelize } from "sequelize";
import { Aircraft, initAircraftModel } from "./Aircraft.js";
import { Airport, initAirportModel } from "./Airport.js";
import { Booking, initBookingModel } from "./Booking.js";
import { Flight, initFlightModel } from "./Flight.js";
import { FlightBooking, initFlightBookingModel } from "./FlightBooking.js";
import { FlightSchedule, initFlightScheduleModel } from "./FlightSchedule.js";
import { FlightSeatAssignment, initFlightSeatAssignmentModel } from "./FlightSeatAssignment.js";
import { Path, initPathModel } from "./Path.js";
import { Seat, initSeatModel } from "./Seat.js";
import { StripeWebhookEvent, initStripeWebhookEventModel } from "./StripeWebhookEvent.js";
import { User, initUserModel } from "./User.js";

export function initModels(sequelize: Sequelize): void {
  initAirportModel(sequelize);
  initPathModel(sequelize);
  initAircraftModel(sequelize);
  initFlightModel(sequelize);
  initUserModel(sequelize);
  initBookingModel(sequelize);
  initFlightBookingModel(sequelize);
  initSeatModel(sequelize);
  initFlightSeatAssignmentModel(sequelize);
  initFlightScheduleModel(sequelize);
  initStripeWebhookEventModel(sequelize);

  Airport.hasMany(Path, { foreignKey: "fromAirportId", as: "departingPaths" });
  Airport.hasMany(Path, { foreignKey: "toAirportId", as: "arrivingPaths" });
  Path.belongsTo(Airport, { foreignKey: "fromAirportId", as: "fromAirport" });
  Path.belongsTo(Airport, { foreignKey: "toAirportId", as: "toAirport" });

  Flight.belongsTo(Path, { foreignKey: "pathId" });
  Flight.belongsTo(Aircraft, { foreignKey: "aircraftId" });
  Path.hasMany(Flight, { foreignKey: "pathId" });
  Aircraft.hasMany(Flight, { foreignKey: "aircraftId" });

  User.hasMany(Booking, { foreignKey: "userId" });
  Booking.belongsTo(User, { foreignKey: "userId" });

  Booking.hasMany(FlightSeatAssignment, { foreignKey: "bookingId" });

  Booking.belongsToMany(Flight, {
    through: FlightBooking,
    foreignKey: "BookingId",
    otherKey: "FlightId",
  });
  Flight.belongsToMany(Booking, {
    through: FlightBooking,
    foreignKey: "FlightId",
    otherKey: "BookingId",
  });

  Aircraft.hasMany(Seat, { foreignKey: "aircraftId" });
  Seat.belongsTo(Aircraft, { foreignKey: "aircraftId" });

  Flight.hasMany(FlightSeatAssignment, { foreignKey: "flightId" });
  FlightSeatAssignment.belongsTo(Flight, { foreignKey: "flightId" });
  FlightSeatAssignment.belongsTo(Seat, { foreignKey: "seatId" });
  FlightSeatAssignment.belongsTo(Booking, { foreignKey: "bookingId" });
  FlightSeatAssignment.belongsTo(User, { foreignKey: "userId" });

  Flight.hasMany(FlightSchedule, { foreignKey: "flightId" });
  FlightSchedule.belongsTo(Flight, { foreignKey: "flightId" });
}

export {
  Airport,
  Path,
  Aircraft,
  Flight,
  User,
  Booking,
  FlightBooking,
  Seat,
  FlightSeatAssignment,
  FlightSchedule,
  StripeWebhookEvent,
};
