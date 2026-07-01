'use strict';

// Users.email had two separate unique indexes (`email` and `email_2`),
// left over from addColumn({unique:true}) followed by
// changeColumn({unique:true}) each creating their own index instead of
// reusing one. Only the redundant `email_2` index is removed; `email`
// remains and continues to enforce uniqueness.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Users', 'email_2');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addIndex('Users', ['email'], {
      name: 'email_2',
      unique: true,
    });
  },
};
