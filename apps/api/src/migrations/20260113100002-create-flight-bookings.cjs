"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("FlightBookings", {
      BookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "Bookings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      FlightId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: "Flights", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("FlightBookings");
  },
};
