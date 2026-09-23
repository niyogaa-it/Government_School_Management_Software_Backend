// models/tc.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Studentsslc = require("./studentsslc");

const Tc = sequelize.define("Tc", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  // e.g. "STMC/TC/0001"  — sequential PER school, never resets
  tcNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Running serial of withdrawals for this school (1, 2, 3 …)
  withdrawnNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "school", key: "id" },
  },
  studentsslc_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Studentsslc", key: "id" },
  },
  admissionNumber: { type: DataTypes.STRING, allowNull: true },
  studentName:     { type: DataTypes.STRING, allowNull: true },
  academicYear:    { type: DataTypes.STRING, allowNull: true },
  grade:           { type: DataTypes.STRING, allowNull: true },
  section:         { type: DataTypes.STRING, allowNull: true },

  // TC-specific fields
  tcDate:          { type: DataTypes.DATEONLY, allowNull: true },
  reason:          { type: DataTypes.STRING,   allowNull: true },
  conductCertificate: { type: DataTypes.STRING, allowNull: true, defaultValue: "Good" },
  remarks:         { type: DataTypes.TEXT, allowNull: true },

  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Issued",   // Issued | Cancelled
  },
}, {
  timestamps: true,
  tableName: "Tc",
});

Tc.belongsTo(School,       { foreignKey: "school_id" });
Tc.belongsTo(Studentsslc,  { foreignKey: "studentsslc_id" });

module.exports = Tc;
