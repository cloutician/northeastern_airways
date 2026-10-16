import type { Sequelize } from "sequelize";
import { DataTypes, Model } from "sequelize";

export class StripeWebhookEvent extends Model {
  declare id: string;
  declare readonly createdAt: Date;
}

export function initStripeWebhookEventModel(sequelize: Sequelize): typeof StripeWebhookEvent {
  StripeWebhookEvent.init(
    {
      id: { type: DataTypes.STRING, primaryKey: true },
    },
    {
      sequelize,
      modelName: "StripeWebhookEvent",
      tableName: "StripeWebhookEvents",
      updatedAt: false,
    },
  );
  return StripeWebhookEvent;
}
