"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Paths", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      distance: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      fromAirportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Airports", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      toAirportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Airports", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addConstraint("Paths", {
      fields: ["fromAirportId", "toAirportId"],
      type: "unique",
      name: "paths_from_to_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Paths");
  },
};
