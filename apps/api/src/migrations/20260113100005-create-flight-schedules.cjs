"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("FlightSchedules", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      flightId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "Flights", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scheduledDeparture: Sequelize.DATE,
      actualDeparture: Sequelize.DATE,
      scheduledArrival: Sequelize.DATE,
      actualArrival: Sequelize.DATE,
      terminal: Sequelize.STRING,
      gate: Sequelize.STRING,
      aircraftType: Sequelize.STRING,
      flightPlanOrigin: Sequelize.STRING,
      flightPlanDestination: Sequelize.STRING,
      estimatedTimeEnRoute: Sequelize.STRING,
      alternateAirports: Sequelize.STRING,
      status: Sequelize.STRING,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("FlightSchedules");
  },
};
