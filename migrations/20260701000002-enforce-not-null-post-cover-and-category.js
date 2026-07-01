'use strict';

// Posts.cover and Posts.category were nullable in the live database despite
// the model declaring allowNull: false for both, and every route always
// supplying a value. This aligns the database constraint with the model
// and actual application behavior.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Posts', 'cover', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('Posts', 'category', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Posts', 'cover', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('Posts', 'category', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
