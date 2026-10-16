import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class Seat extends Model {
  declare id: string;
  declare aircraftId: string;
  declare seatNumber: string;
  declare cabinClass: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initSeatModel(sequelize: Sequelize): typeof Seat {
  Seat.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      aircraftId: { type: DataTypes.UUID, allowNull: false },
      seatNumber: { type: DataTypes.STRING, allowNull: false },
      cabinClass: { type: DataTypes.STRING, allowNull: false, defaultValue: "economy" },
    },
    { sequelize, modelName: "Seat", tableName: "Seats" },
  );
  return Seat;
}
