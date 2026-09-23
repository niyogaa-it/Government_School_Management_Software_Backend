const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * StudentFeeDemand
 * ─────────────────
 * ONE ROW PER STUDENT PER DEMAND.
 *
 * Created by:
 *   • Bulk raise  – when admin raises demand for a whole grade/section/medium/type,
 *                   one row is inserted for every matching student.
 *   • Individual  – when admin raises demand for a single student.
 *
 * Status lifecycle:  Unpaid → Partial → Paid
 *
 * When payment is collected (via FeeCollectionList page):
 *   paid_amount is updated, status transitions, and a FeeCollection receipt is created.
 */
const StudentFeeDemand = sequelize.define(
  "StudentFeeDemand",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    school_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academic_year: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Which fee-structure template this came from (optional, for bulk raise tracing)
    demand_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Student identifiers
    admission_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    emis_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    student_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    section: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    course: {
      type: DataTypes.STRING,   // "SSLC" | "HSC"
      allowNull: true,
    },
    medium: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    student_type: {
      type: DataTypes.STRING,   // "new" | "old"
      allowNull: true,
    },
    // Fee breakdown
    fee_items: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "[{ type, description, amount }]",
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    balance_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // Unpaid | Partial | Paid
    status: {
      type: DataTypes.ENUM("Unpaid", "Partial", "Paid"),
      defaultValue: "Unpaid",
    },
  },
  {
    tableName: "student_fee_demands",
    timestamps: true,
  }
);

module.exports = StudentFeeDemand;
