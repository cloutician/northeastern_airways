import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class FlightBooking extends Model {
  declare BookingId: number;
  declare FlightId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initFlightBookingModel(sequelize: Sequelize): typeof FlightBooking {
  FlightBooking.init(
    {
      BookingId: { type: DataTypes.INTEGER, primaryKey: true },
      FlightId: { type: DataTypes.UUID, primaryKey: true },
    },
    { sequelize, modelName: "FlightBooking", tableName: "FlightBookings" },
  );
  return FlightBooking;
}
