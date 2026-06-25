'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'Posts',
      'resizedCover'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'Posts',
      'resizedCover',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },
};