"use strict";

const bcrypt = require("bcryptjs");

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const hash = await bcrypt.hash("Passw0rd!", 10);

    const insertUser = async (row, options = {}) => {
      const useAdminForApprovedBy = options.useAdminForApprovedBy === true;
      const approvedBySql = useAdminForApprovedBy
        ? `(SELECT id FROM "Users" WHERE email = 'admin@northeastern-airways.test' LIMIT 1)`
        : ":approvedBy";

      await queryInterface.sequelize.query(
        `
        INSERT INTO "Users" (
          "firstName", "lastName", "email", "password", "role", "personnelType",
          "emailVerified", "approvalStatus", "approvedBy", "approvedAt",
          "createdAt", "updatedAt"
        )
        VALUES (
          :firstName, :lastName, :email, :password, :role, :personnelType,
          :emailVerified, :approvalStatus, ${approvedBySql}, :approvedAt,
          :createdAt, :updatedAt
        )
        ON CONFLICT ("email") DO UPDATE SET
          "firstName" = EXCLUDED."firstName",
          "lastName" = EXCLUDED."lastName",
          "password" = EXCLUDED."password",
          "role" = EXCLUDED."role",
          "personnelType" = EXCLUDED."personnelType",
          "emailVerified" = EXCLUDED."emailVerified",
          "approvalStatus" = EXCLUDED."approvalStatus",
          "approvedBy" = EXCLUDED."approvedBy",
          "approvedAt" = EXCLUDED."approvedAt",
          "updatedAt" = EXCLUDED."updatedAt";
        `,
        {
          replacements: {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            password: row.password,
            role: row.role,
            personnelType: row.personnelType,
            emailVerified: row.emailVerified,
            approvalStatus: row.approvalStatus,
            approvedBy: row.approvedBy,
            approvedAt: row.approvedAt,
            createdAt: now,
            updatedAt: now,
          },
        },
      );
    };

    await insertUser({
      firstName: "Admin",
      lastName: "User",
      email: "admin@northeastern-airways.test",
      password: hash,
      role: "administrator",
      personnelType: null,
      emailVerified: true,
      approvalStatus: "approved",
      approvedBy: null,
      approvedAt: now,
    });

    await insertUser({
      firstName: "Pat",
      lastName: "Passenger",
      email: "passenger@northeastern-airways.test",
      password: hash,
      role: "passenger",
      personnelType: null,
      emailVerified: true,
      approvalStatus: "approved",
      approvedBy: null,
      approvedAt: now,
    });

    await insertUser(
      {
        firstName: "Terry",
        lastName: "Tech",
        email: "personnel@northeastern-airways.test",
        password: hash,
        role: "personnel",
        personnelType: "technical",
        emailVerified: true,
        approvalStatus: "approved",
        approvedBy: null,
        approvedAt: now,
      },
      { useAdminForApprovedBy: true },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      "Users",
      {
        email: {
          [Sequelize.Op.in]: [
            "admin@northeastern-airways.test",
            "passenger@northeastern-airways.test",
            "personnel@northeastern-airways.test",
          ],
        },
      },
      {},
    );
  },
};
