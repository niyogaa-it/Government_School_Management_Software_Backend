const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");

const Subject = sequelize.define("Subject", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subjectName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shortCode: {
    type: DataTypes.STRING,
    allowNull: false,
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
  section_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "section",
      key: "id",
    },
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
Subject.belongsTo(Section, { foreignKey: "section_id" });

module.exports = Subject;
