const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FeeCollection = sequelize.define(
  "FeeCollection",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    receipt_no: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    school_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academic_year: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    admission_number: {
      type: DataTypes.STRING,
      allowNull: false,
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
      type: DataTypes.STRING,
      allowNull: true,
    },
    fee_items: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    medium: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    student_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    balance_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    payment_mode: {
      type: DataTypes.ENUM("Cash", "Online", "Cheque", "DD"),
      defaultValue: "Cash",
    },
    collection_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    collected_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "fee_collections",
    timestamps: true,
  }
);

module.exports = FeeCollection;