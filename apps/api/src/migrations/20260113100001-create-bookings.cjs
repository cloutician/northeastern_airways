"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Bookings", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      price: { type: Sequelize.DOUBLE, allowNull: false },
      paymentStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      bookingStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      baggageCount: Sequelize.INTEGER,
      promoCode: Sequelize.STRING,
      stripePaymentIntentId: Sequelize.STRING,
      billingEmail: Sequelize.STRING,
      refundAmount: Sequelize.DOUBLE,
      cancellationReason: Sequelize.TEXT,
      cancellationDate: Sequelize.DATE,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Bookings");
  },
};
