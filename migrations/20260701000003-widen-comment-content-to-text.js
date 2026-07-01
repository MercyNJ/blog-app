'use strict';

// Comments.content was VARCHAR(255) in the live database despite the model
// declaring DataTypes.TEXT, likely the missing half of the "longer comment
// support" improvement. Widening VARCHAR(255) to TEXT never truncates or
// loses existing data.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Comments', 'content', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Comments', 'content', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
