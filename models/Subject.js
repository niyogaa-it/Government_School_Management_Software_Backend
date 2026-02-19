const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");

const Subject = sequelize.define("Subject", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "school",
      key: "id",
    },
  },
  grade_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "grade",
      key: "id",
    },
  },
  subjectName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shortCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  timestamps: false,
  tableName: "subject",
});

// Define associations
Subject.belongsTo(School, { foreignKey: "school_id" });
Subject.belongsTo(Grade, { foreignKey: "grade_id" });

module.exports = Subject;
