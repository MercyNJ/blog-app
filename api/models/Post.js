const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PostModel = sequelize.define('Post', {
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
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
