// models/tchsc.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School     = require("./school");
const Studenthsc = require("./studenthsc");

const Tchsc = sequelize.define("Tchsc", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  // e.g. "RMHSS/TC-HSC/0001"  — sequential per school, never resets
  tcNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Running withdrawal serial for this school (1, 2, 3 …)
  withdrawnNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "school", key: "id" },
  },
  studenthsc_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Studenthsc", key: "id" },
  },

  // ── Student snapshot (frozen at TC issue time) ──────────────────────────
  admissionNumber: { type: DataTypes.STRING, allowNull: true },
  studentName:     { type: DataTypes.STRING, allowNull: true },
  academicYear:    { type: DataTypes.STRING, allowNull: true },
  grade:           { type: DataTypes.STRING, allowNull: true },
  section:         { type: DataTypes.STRING, allowNull: true },
  group:           { type: DataTypes.STRING, allowNull: true },   // HSC-specific

  // ── TC details ───────────────────────────────────────────────────────────
  tcDate:             { type: DataTypes.DATEONLY, allowNull: true },
  reason:             { type: DataTypes.STRING,   allowNull: true },
  conductCertificate: { type: DataTypes.STRING,   allowNull: true, defaultValue: "Good" },
  remarks:            { type: DataTypes.TEXT,     allowNull: true },

  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Issued",    // Issued | Cancelled
  },
}, {
  timestamps: true,
  tableName: "Tchsc",
});

Tchsc.belongsTo(School,     { foreignKey: "school_id" });
Tchsc.belongsTo(Studenthsc, { foreignKey: "studenthsc_id" });

module.exports = Tchsc;
