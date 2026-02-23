const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RaiseFeeDemand = sequelize.define("RaiseFeeDemand", {
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
  selected_grades: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  fee_details: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "fee_demands",
  timestamps: false, // or true if you want Sequelize to auto-manage timestamps
});

module.exports = RaiseFeeDemand;
