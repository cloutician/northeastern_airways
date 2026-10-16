"use strict";

/** Full UK airport set aligned with legacy fullstack seeder `20250617-seed-airports.js`. */
/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [
      { code: "NQY", name: "Newquay Cornwall Airport", city: "Newquay", country: "UK", latitude: 50.447, longitude: -5.00374 },
      { code: "EXT", name: "Exeter International Airport", city: "Exeter", country: "UK", latitude: 50.7344, longitude: -3.41389 },
      { code: "BOH", name: "Bournemouth Airport", city: "Bournemouth", country: "UK", latitude: 50.7776, longitude: -1.83242 },
      { code: "SOU", name: "Southampton Airport", city: "Southampton", country: "UK", latitude: 50.9504, longitude: -1.36157 },
      { code: "BRS", name: "Bristol Airport", city: "Bristol", country: "UK", latitude: 51.3827, longitude: -2.71909 },
      { code: "CWL", name: "Cardiff Airport", city: "Cardiff", country: "UK", latitude: 51.3967, longitude: -3.34333 },
      { code: "LGW", name: "Gatwick Airport", city: "London", country: "UK", latitude: 51.1568, longitude: -0.169987 },
      { code: "SEN", name: "London Southend Airport", city: "London", country: "UK", latitude: 51.5679, longitude: 0.700259 },
      { code: "LCY", name: "London City Airport", city: "London", country: "UK", latitude: 51.5039, longitude: 0.0497962 },
      { code: "LHR", name: "Heathrow Airport", city: "London", country: "UK", latitude: 51.4706, longitude: -0.461941 },
      { code: "STN", name: "London Stansted Airport", city: "London", country: "UK", latitude: 51.8894, longitude: 0.261515 },
      { code: "LTN", name: "Luton Airport", city: "Luton", country: "UK", latitude: 51.8747, longitude: -0.368333 },
      { code: "NWI", name: "Norwich Airport", city: "Norwich", country: "UK", latitude: 52.6704, longitude: 1.27648 },
      { code: "BHX", name: "Birmingham International Airport", city: "Birmingham", country: "UK", latitude: 52.4539, longitude: -1.74803 },
      { code: "EMA", name: "East Midlands Airport", city: "Derby", country: "UK", latitude: 52.8311, longitude: -1.32806 },
      { code: "DSA", name: "Doncaster Sheffield Airport", city: "Doncaster", country: "UK", latitude: 53.481, longitude: -1.0112 },
      { code: "MAN", name: "Manchester Airport", city: "Manchester", country: "UK", latitude: 53.3537, longitude: -2.27495 },
      { code: "LPL", name: "Liverpool John Lennon Airport", city: "Liverpool", country: "UK", latitude: 53.3372, longitude: -2.85425 },
      { code: "LBA", name: "Leeds Bradford Airport", city: "Leeds", country: "UK", latitude: 53.8685, longitude: -1.66123 },
      { code: "MME", name: "Durham Tees Valley Airport", city: "Durham", country: "UK", latitude: 54.5116, longitude: -1.43296 },
      { code: "NCL", name: "Newcastle Airport", city: "Newcastle", country: "UK", latitude: 55.0374, longitude: -1.70962 },
      { code: "PIK", name: "Glasgow Prestwick Airport", city: "Glasgow", country: "UK", latitude: 55.5091, longitude: -4.6109 },
      { code: "GLA", name: "Glasgow International Airport", city: "Glasgow", country: "UK", latitude: 55.8646, longitude: -4.43234 },
      { code: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "UK", latitude: 55.948, longitude: -3.36519 },
      { code: "ABZ", name: "Aberdeen Airport", city: "Aberdeen", country: "UK", latitude: 57.2004, longitude: -2.20373 },
      { code: "INV", name: "Inverness Airport", city: "Inverness", country: "UK", latitude: 57.5425, longitude: -4.0475 },
      { code: "LDY", name: "City of Derry Airport", city: "Derry", country: "UK", latitude: 55.0396, longitude: -7.15578 },
      { code: "BFS", name: "Belfast International Airport", city: "Belfast", country: "UK", latitude: 54.6617, longitude: -6.21764 },
      { code: "BHD", name: "George Best Belfast City Airport", city: "Belfast", country: "UK", latitude: 54.6156, longitude: -5.87047 },
    ];

    for (const r of rows) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO "Airports" ("code", "name", "city", "country", "latitude", "longitude", "createdAt", "updatedAt")
        VALUES (:code, :name, :city, :country, :latitude, :longitude, :createdAt, :updatedAt)
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "city" = EXCLUDED."city",
          "country" = EXCLUDED."country",
          "latitude" = EXCLUDED."latitude",
          "longitude" = EXCLUDED."longitude",
          "updatedAt" = EXCLUDED."updatedAt";
        `,
        {
          replacements: {
            ...r,
            createdAt: now,
            updatedAt: now,
          },
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Airports", null, {});
  },
};
