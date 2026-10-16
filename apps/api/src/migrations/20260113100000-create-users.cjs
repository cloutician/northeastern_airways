"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      firstName: Sequelize.STRING,
      lastName: Sequelize.STRING,
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      role: { type: Sequelize.STRING, allowNull: false },
      personnelType: Sequelize.STRING,
      emailVerified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      verificationCode: Sequelize.STRING,
      verificationCodeExpires: Sequelize.DATE,
      profilePicture: Sequelize.STRING,
      phoneNumber: Sequelize.STRING,
      alternatePhoneNumber: Sequelize.STRING,
      streetAddress: Sequelize.STRING,
      city: Sequelize.STRING,
      postalCode: Sequelize.STRING,
      country: Sequelize.STRING,
      approvalStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      approvedAt: Sequelize.DATE,
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Users");
  },
};
