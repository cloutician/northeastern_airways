"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Aircraft", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      registrationNumber: Sequelize.STRING,
      serialNumber: Sequelize.STRING,
      modelNumber: Sequelize.STRING,
      dateOfManufacture: Sequelize.DATE,
      aircraftType: Sequelize.STRING,
      manufacturer: Sequelize.STRING,
      popularName: Sequelize.STRING,
      genericName: Sequelize.STRING,
      aircraftClass: Sequelize.STRING,
      numberOfEngines: Sequelize.INTEGER,
      aipCountryCode: Sequelize.STRING,
      aipDetails: Sequelize.TEXT,
      type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      seatLayout: Sequelize.JSONB,
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
    await queryInterface.dropTable("Aircraft");
  },
};
