'use strict';

// Enforces Users.email as NOT NULL + unique, matching the User model.
// Run only after any existing rows have real email values backfilled —
// a NOT NULL/unique constraint can't apply over NULL or duplicate data.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    const indexes = await queryInterface.showIndex('Users');
    const hasEmailIndex = indexes.some(index => index.name === 'email');

    if (!hasEmailIndex) {
      await queryInterface.addIndex('Users', ['email'], {
        name: 'email',
        unique: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
