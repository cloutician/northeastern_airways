"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Seats", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      aircraftId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Aircraft", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      seatNumber: { type: Sequelize.STRING, allowNull: false },
      cabinClass: { type: Sequelize.STRING, allowNull: false, defaultValue: "economy" },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addConstraint("Seats", {
      fields: ["aircraftId", "seatNumber"],
      type: "unique",
      name: "seats_aircraft_seat_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Seats");
  },
};
