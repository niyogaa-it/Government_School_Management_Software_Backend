const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const School = require("./school");

const Event = sequelize.define("Event", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "school", key: "id" },
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  eventDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  grade_ids: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  attachmentName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  attachmentType: {
    type: DataTypes.STRING(100), // e.g. "application/pdf", "image/jpeg"
    allowNull: true,
  },
  //  Store the actual file as base64 string in the DB
  attachmentData: {
    type: DataTypes.TEXT("long"), // LONGTEXT — holds base64 of up to ~2MB files
    allowNull: true,
  },
}, {
  tableName: "Events",
  timestamps: true,
});

Event.belongsTo(School, { foreignKey: "school_id", as: "school" });

module.exports = Event;