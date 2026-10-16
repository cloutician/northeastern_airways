"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Flights", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      flightNumber: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      aircraftId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Aircraft", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      pathId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Paths", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      departureTime: Sequelize.DATE,
      arrivalTime: Sequelize.DATE,
      flightTime: Sequelize.INTEGER,
      travelTime: Sequelize.INTEGER,
      meals: Sequelize.STRING,
      additionalInfo: Sequelize.TEXT,
      averageRating: Sequelize.FLOAT,
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Flights");
  },
};
