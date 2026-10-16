import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class Path extends Model {
  declare id: number;
  declare distance: number;
  declare fromAirportId: number;
  declare toAirportId: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initPathModel(sequelize: Sequelize): typeof Path {
  Path.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      distance: { type: DataTypes.FLOAT, allowNull: false },
      fromAirportId: { type: DataTypes.INTEGER, allowNull: false },
      toAirportId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: "Path", tableName: "Paths" },
  );
  return Path;
}
