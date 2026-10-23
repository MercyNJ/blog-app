const { DataTypes } = require('sequelize');
const sequelize = require('../database');

// Entries are only ever created, never edited, so there is no updatedAt.
const AuditLogModel = sequelize.define('AuditLog', {
  actorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  actorUsername: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  targetType: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  targetLabel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  updatedAt: false,
});

module.exports = AuditLogModel;
