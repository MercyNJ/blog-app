const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserModel = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [4, 255],
        msg: 'Username must be between 4 and 255 characters.'
      }
    }
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Please enter a valid email address.'
      }
    }
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'user'
  },

  // Incremented on password change so older login tokens stop working.
  tokenVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  // Forgot password: a SHA-256 hash of the emailed token, never the token itself.
  resetPasswordTokenHash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },

  resetPasswordExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = UserModel;