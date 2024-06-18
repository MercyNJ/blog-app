const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserModel = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [4]
    },
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = UserModel;
