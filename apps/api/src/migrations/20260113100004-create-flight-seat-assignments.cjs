"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("FlightSeatAssignments", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      flightId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Flights", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      seatId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Seats", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Bookings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "booked" },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addConstraint("FlightSeatAssignments", {
      fields: ["flightId", "seatId"],
      type: "unique",
      name: "flight_seat_assignments_flight_seat_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("FlightSeatAssignments");
  },
};
