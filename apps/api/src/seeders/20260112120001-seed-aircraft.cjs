"use strict";

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const id = "11111111-1111-4111-8111-111111111111";
    await queryInterface.sequelize.query(
      `
      INSERT INTO "Aircraft" ("id", "registrationNumber", "modelNumber", "type", "manufacturer", "popularName", "createdAt", "updatedAt")
      VALUES (:id, :registrationNumber, :modelNumber, :type, :manufacturer, :popularName, :createdAt, :updatedAt)
      ON CONFLICT ("id") DO UPDATE SET
        "registrationNumber" = EXCLUDED."registrationNumber",
        "modelNumber" = EXCLUDED."modelNumber",
        "type" = EXCLUDED."type",
        "manufacturer" = EXCLUDED."manufacturer",
        "popularName" = EXCLUDED."popularName",
        "updatedAt" = EXCLUDED."updatedAt";
      `,
      {
        replacements: {
          id,
          registrationNumber: "G-NEAIR",
          modelNumber: "737-800",
          type: "Boeing 737",
          manufacturer: "Boeing",
          popularName: "NE Demo",
          createdAt: now,
          updatedAt: now,
        },
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Aircraft", { id: "11111111-1111-4111-8111-111111111111" });
  },
};
