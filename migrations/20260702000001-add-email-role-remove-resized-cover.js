'use strict';

// Catches production up to schema changes dev already had before the
// baseline migration was written: adds email/role to Users (nullable
// for now — enforced NOT NULL by the next migration, after a manual
// backfill of any existing rows) and drops the retired Posts.resizedCover
// column. Column-existence checks make this a no-op wherever these
// changes already exist (e.g. local dev).

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersTable = await queryInterface.describeTable('Users');

    if (!usersTable.email) {
      await queryInterface.addColumn('Users', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!usersTable.role) {
      await queryInterface.addColumn('Users', 'role', {
        type: Sequelize.ENUM('admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
      });
    }

    const postsTable = await queryInterface.describeTable('Posts');

    if (postsTable.resizedCover) {
      await queryInterface.removeColumn('Posts', 'resizedCover');
    }
  },

  async down(queryInterface, Sequelize) {
    const postsTable = await queryInterface.describeTable('Posts');

    if (!postsTable.resizedCover) {
      await queryInterface.addColumn('Posts', 'resizedCover', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    const usersTable = await queryInterface.describeTable('Users');

    if (usersTable.role) {
      await queryInterface.removeColumn('Users', 'role');
    }

    if (usersTable.email) {
      await queryInterface.removeColumn('Users', 'email');
    }
  },
};
