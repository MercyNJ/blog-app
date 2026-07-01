'use strict';

// Baseline migration: reproduces the database schema exactly as it exists
// today (verified against `SHOW CREATE TABLE` output), including known
// quirks (duplicate unique index on Users.email, nullable Posts.cover/category,
// Comments.content as VARCHAR(255)). Those are corrected by real follow-up
// migrations, not silently "fixed" here, so this file stays an honest
// snapshot of reality rather than an aspirational one.
//
// Table creation order follows foreign-key dependencies: Users -> Posts -> Comments.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      role: {
        type: Sequelize.ENUM('admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
      },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_0900_ai_ci',
    });

    // Reproduces the duplicate unique index found on the live email column.
    // Removed by 20260701000001-remove-duplicate-email-index.js.
    await queryInterface.addIndex('Users', ['email'], {
      name: 'email_2',
      unique: true,
    });

    await queryInterface.createTable('Posts', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      cover: {
        // Nullable in the live database today, though the model and every
        // route always supply a value. Enforced NOT NULL by
        // 20260701000002-enforce-not-null-post-cover-and-category.js.
        type: Sequelize.STRING,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_0900_ai_ci',
    });

    await queryInterface.createTable('Comments', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Posts',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        // No ON DELETE clause, matching the live constraint (defaults to
        // RESTRICT). Widened by 20260701000003-widen-comment-content-to-text.js
        // only touches `content`, not this constraint.
        onUpdate: 'CASCADE',
      },
      content: {
        // VARCHAR(255) in the live database today, though the model
        // declares TEXT. Widened by
        // 20260701000003-widen-comment-content-to-text.js.
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_0900_ai_ci',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Comments');
    await queryInterface.dropTable('Posts');
    await queryInterface.dropTable('Users');
  },
};
