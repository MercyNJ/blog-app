const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PostModel = sequelize.define('Post', {
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  summary: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  cover: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = PostModel;