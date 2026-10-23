'use strict';

// Adds Users.tokenVersion (default 0). Login tokens carry it, and a password change increments it,
// which ends every older login session. Existing rows get 0, so current logins stay valid.
// down() only removes this column.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'tokenVersion', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'tokenVersion');
  },
};
