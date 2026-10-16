import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class Aircraft extends Model {
  declare id: string;
  declare registrationNumber: string | null;
  declare serialNumber: string | null;
  declare modelNumber: string | null;
  declare dateOfManufacture: Date | null;
  declare aircraftType: string | null;
  declare manufacturer: string | null;
  declare popularName: string | null;
  declare genericName: string | null;
  declare aircraftClass: string | null;
  declare numberOfEngines: number | null;
  declare aipCountryCode: string | null;
  declare aipDetails: string | null;
  declare type: string | null;
  declare seatLayout: object | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initAircraftModel(sequelize: Sequelize): typeof Aircraft {
  Aircraft.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      registrationNumber: DataTypes.STRING,
      serialNumber: DataTypes.STRING,
      modelNumber: DataTypes.STRING,
      dateOfManufacture: DataTypes.DATE,
      aircraftType: DataTypes.STRING,
      manufacturer: DataTypes.STRING,
      popularName: DataTypes.STRING,
      genericName: DataTypes.STRING,
      aircraftClass: DataTypes.STRING,
      numberOfEngines: DataTypes.INTEGER,
      aipCountryCode: DataTypes.STRING,
      aipDetails: DataTypes.TEXT,
      type: DataTypes.STRING,
      seatLayout: DataTypes.JSONB,
    },
    { sequelize, modelName: "Aircraft", tableName: "Aircraft" },
  );
  return Aircraft;
}
