'use strict';

// Read-only record of admin actions (post create/edit/delete, admin edits/deletes of others'
// comments). Only adds a new table; down() only drops it. No collation is set so the table
// uses the database default (works on MySQL and MariaDB).

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AuditLogs', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      actorId: {
        // Kept nullable so deleting an admin account never deletes its history.
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      actorUsername: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      targetType: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      targetId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      targetLabel: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('AuditLogs', ['createdAt'], {
      name: 'audit_logs_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AuditLogs');
  },
};
