import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class Booking extends Model {
  declare id: number;
  declare userId: number;
  declare price: number;
  declare paymentStatus: string;
  declare bookingStatus: string;
  declare baggageCount: number | null;
  declare promoCode: string | null;
  declare stripePaymentIntentId: string | null;
  declare billingEmail: string | null;
  declare refundAmount: number | null;
  declare cancellationReason: string | null;
  declare cancellationDate: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initBookingModel(sequelize: Sequelize): typeof Booking {
  Booking.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DOUBLE, allowNull: false },
      paymentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      bookingStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      baggageCount: DataTypes.INTEGER,
      promoCode: DataTypes.STRING,
      stripePaymentIntentId: DataTypes.STRING,
      billingEmail: DataTypes.STRING,
      refundAmount: DataTypes.DOUBLE,
      cancellationReason: DataTypes.TEXT,
      cancellationDate: DataTypes.DATE,
    },
    { sequelize, modelName: "Booking", tableName: "Bookings" },
  );
  return Booking;
}
