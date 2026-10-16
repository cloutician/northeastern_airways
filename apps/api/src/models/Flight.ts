import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class Flight extends Model {
  declare id: string;
  declare flightNumber: string;
  declare date: string;
  declare aircraftId: string;
  declare cost: string;
  declare pathId: number;
  declare departureTime: Date | null;
  declare arrivalTime: Date | null;
  declare flightTime: number | null;
  declare travelTime: number | null;
  declare meals: string | null;
  declare additionalInfo: string | null;
  declare averageRating: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initFlightModel(sequelize: Sequelize): typeof Flight {
  Flight.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      flightNumber: { type: DataTypes.STRING, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      aircraftId: { type: DataTypes.UUID, allowNull: false },
      cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      pathId: { type: DataTypes.INTEGER, allowNull: false },
      departureTime: DataTypes.DATE,
      arrivalTime: DataTypes.DATE,
      flightTime: DataTypes.INTEGER,
      travelTime: DataTypes.INTEGER,
      meals: DataTypes.STRING,
      additionalInfo: DataTypes.TEXT,
      averageRating: DataTypes.FLOAT,
    },
    { sequelize, modelName: "Flight", tableName: "Flights" },
  );
  return Flight;
}
