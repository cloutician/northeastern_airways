import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class User extends Model {
  declare id: number;
  declare firstName: string | null;
  declare lastName: string | null;
  declare email: string;
  declare password: string;
  declare role: string;
  declare personnelType: string | null;
  declare emailVerified: boolean;
  declare verificationCode: string | null;
  declare verificationCodeExpires: Date | null;
  declare profilePicture: string | null;
  declare phoneNumber: string | null;
  declare alternatePhoneNumber: string | null;
  declare streetAddress: string | null;
  declare city: string | null;
  declare postalCode: string | null;
  declare country: string | null;
  declare approvalStatus: string;
  declare approvedBy: number | null;
  declare approvedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, allowNull: false },
      personnelType: DataTypes.STRING,
      emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      verificationCode: DataTypes.STRING,
      verificationCodeExpires: DataTypes.DATE,
      profilePicture: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      alternatePhoneNumber: DataTypes.STRING,
      streetAddress: DataTypes.STRING,
      city: DataTypes.STRING,
      postalCode: DataTypes.STRING,
      country: DataTypes.STRING,
      approvalStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      approvedBy: DataTypes.INTEGER,
      approvedAt: DataTypes.DATE,
    },
    { sequelize, modelName: "User", tableName: "Users" },
  );
  return User;
}
