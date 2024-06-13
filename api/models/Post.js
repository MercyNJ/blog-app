const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PostModel = sequelize.define('Post', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  summary: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cover: {
    type: DataTypes.STRING
  },
  resizedCover: {
    type: DataTypes.STRING
  },
  category: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true
});

module.exports = PostModel;
