'use strict';

// Adds nullable Users.resetPasswordTokenHash and Users.resetPasswordExpiresAt for forgot password.
// Only a SHA-256 hash of the emailed token is stored. Existing rows stay NULL; down() only removes these.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'resetPasswordTokenHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'resetPasswordExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('Users', ['resetPasswordTokenHash'], {
      name: 'users_reset_password_token_hash',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Users', 'users_reset_password_token_hash');
    await queryInterface.removeColumn('Users', 'resetPasswordExpiresAt');
    await queryInterface.removeColumn('Users', 'resetPasswordTokenHash');
  },
};
