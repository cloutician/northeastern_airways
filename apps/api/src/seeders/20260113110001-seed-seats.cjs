"use strict";

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const aircraftId = "11111111-1111-4111-8111-111111111111";
    const now = new Date();
    const seats = [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", seatNumber: "1A", cabinClass: "economy" },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", seatNumber: "1B", cabinClass: "economy" },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", seatNumber: "1C", cabinClass: "economy" },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", seatNumber: "2A", cabinClass: "business" },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", seatNumber: "2B", cabinClass: "business" },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6", seatNumber: "2C", cabinClass: "business" },
    ];

    for (const s of seats) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO "Seats" ("id", "aircraftId", "seatNumber", "cabinClass", "createdAt", "updatedAt")
        VALUES (:id, :aircraftId, :seatNumber, :cabinClass, :createdAt, :updatedAt)
        ON CONFLICT ("aircraftId", "seatNumber") DO UPDATE SET
          "cabinClass" = EXCLUDED."cabinClass",
          "updatedAt" = EXCLUDED."updatedAt";
        `,
        {
          replacements: {
            ...s,
            aircraftId,
            createdAt: now,
            updatedAt: now,
          },
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Seats", { aircraftId: "11111111-1111-4111-8111-111111111111" }, {});
  },
};
