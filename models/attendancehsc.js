// models/attendancehsc.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School   = require("./school");
const Grade    = require("./grade");
const Section  = require("./section");

const AttendanceHSC = sequelize.define("AttendanceHSC", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "school", key: "id" },
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  grade_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "grade", key: "id" },
  },
  section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "section", key: "id" },
  },
  // Date stored as DATEONLY string "YYYY-MM-DD"
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  session: {
    type: DataTypes.STRING,   // "Morning" | "Afternoon"
    allowNull: false,
  },
  admissionNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  studentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Only "Absent" records are stored — Present is inferred
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Absent",
  },
}, {
  timestamps: false,
  tableName: "AttendanceHSC",
  indexes: [
    // Unique per student per session per date — prevents duplicate saves
    { unique: true, fields: ["admissionNumber", "date", "session"] },
  ],
});

AttendanceHSC.belongsTo(School,  { foreignKey: "school_id" });
AttendanceHSC.belongsTo(Grade,   { foreignKey: "grade_id" });
AttendanceHSC.belongsTo(Section, { foreignKey: "section_id", as: "Section" });

module.exports = AttendanceHSC;
