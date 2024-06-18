const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Post = require('./Post');

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

UserModel.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });

module.exports = UserModel;
