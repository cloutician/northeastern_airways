"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StripeWebhookEvents", {
      id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("StripeWebhookEvents");
  },
};
