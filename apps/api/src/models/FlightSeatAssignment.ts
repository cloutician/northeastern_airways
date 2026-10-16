import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class FlightSeatAssignment extends Model {
  declare id: string;
  declare flightId: string;
  declare seatId: string;
  declare bookingId: number;
  declare userId: number | null;
  declare status: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initFlightSeatAssignmentModel(sequelize: Sequelize): typeof FlightSeatAssignment {
  FlightSeatAssignment.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      flightId: { type: DataTypes.UUID, allowNull: false },
      seatId: { type: DataTypes.UUID, allowNull: false },
      bookingId: { type: DataTypes.INTEGER, allowNull: false },
      userId: DataTypes.INTEGER,
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "booked" },
    },
    { sequelize, modelName: "FlightSeatAssignment", tableName: "FlightSeatAssignments" },
  );
  return FlightSeatAssignment;
}
