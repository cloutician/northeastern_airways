import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class Airport extends Model {
  declare id: number;
  declare code: string;
  declare name: string | null;
  declare city: string | null;
  declare country: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initAirportModel(sequelize: Sequelize): typeof Airport {
  Airport.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING, allowNull: false, unique: true },
      name: DataTypes.STRING,
      city: DataTypes.STRING,
      country: DataTypes.STRING,
      latitude: DataTypes.FLOAT,
      longitude: DataTypes.FLOAT,
    },
    { sequelize, modelName: "Airport", tableName: "Airports" },
  );
  return Airport;
}
