"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex("Flights", ["pathId", "date", "departureTime"], { name: "flights_path_date_departure", transaction });
      await queryInterface.addIndex("Flights", ["departureTime", "arrivalTime"], { name: "flights_departure_arrival", transaction });
      await queryInterface.addIndex("FlightSchedules", ["scheduledDeparture"], { name: "schedules_departure", transaction });
      await queryInterface.addIndex("FlightSchedules", ["flightId"], { name: "schedules_flight", transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("FlightSchedules", "schedules_flight", { transaction });
      await queryInterface.removeIndex("FlightSchedules", "schedules_departure", { transaction });
      await queryInterface.removeIndex("Flights", "flights_departure_arrival", { transaction });
      await queryInterface.removeIndex("Flights", "flights_path_date_departure", { transaction });
    });
  },
};
