'use strict';

// Users.email had two separate unique indexes (`email` and `email_2`),
// left over from addColumn({unique:true}) followed by
// changeColumn({unique:true}) each creating their own index instead of
// reusing one. Only the redundant `email_2` index is removed; `email`
// remains and continues to enforce uniqueness. Guarded with an
// existence check since some environments never had an email_2 index
// at all (e.g. production, which predates email being on Users).

module.exports = {
  async up(queryInterface, Sequelize) {
    const indexes = await queryInterface.showIndex('Users');
    const hasEmail2Index = indexes.some(index => index.name === 'email_2');

    if (hasEmail2Index) {
      await queryInterface.removeIndex('Users', 'email_2');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addIndex('Users', ['email'], {
      name: 'email_2',
      unique: true,
    });
  },
};
