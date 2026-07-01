const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const { PASSWORD_REGEX } = require('../utils/passwordPolicy');

const UserModel = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [4, 255]
    }
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

password: {
  type: DataTypes.STRING,
  allowNull: false,
  validate: {
    isStrongPassword(value) {
      if (!PASSWORD_REGEX.test(value)) {
        throw new Error(
          'Password must contain uppercase, lowercase, number and special character.'
        );
      }
    }
  }
},

  role: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'user'
  }
});

module.exports = UserModel;