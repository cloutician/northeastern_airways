import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class FlightSchedule extends Model {
  declare id: string;
  declare flightId: string | null;
  declare scheduledDeparture: Date | null;
  declare actualDeparture: Date | null;
  declare scheduledArrival: Date | null;
  declare actualArrival: Date | null;
  declare terminal: string | null;
  declare gate: string | null;
  declare aircraftType: string | null;
  declare flightPlanOrigin: string | null;
  declare flightPlanDestination: string | null;
  declare estimatedTimeEnRoute: string | null;
  declare alternateAirports: string | null;
  declare status: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initFlightScheduleModel(sequelize: Sequelize): typeof FlightSchedule {
  FlightSchedule.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      flightId: DataTypes.UUID,
      scheduledDeparture: DataTypes.DATE,
      actualDeparture: DataTypes.DATE,
      scheduledArrival: DataTypes.DATE,
      actualArrival: DataTypes.DATE,
      terminal: DataTypes.STRING,
      gate: DataTypes.STRING,
      aircraftType: DataTypes.STRING,
      flightPlanOrigin: DataTypes.STRING,
      flightPlanDestination: DataTypes.STRING,
      estimatedTimeEnRoute: DataTypes.STRING,
      alternateAirports: DataTypes.STRING,
      status: DataTypes.STRING,
    },
    { sequelize, modelName: "FlightSchedule", tableName: "FlightSchedules" },
  );
  return FlightSchedule;
}
