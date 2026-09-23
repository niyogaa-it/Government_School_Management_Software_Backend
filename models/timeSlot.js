const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TimeSet = require("./timeSet");

const TimeSlot = sequelize.define("TimeSlot", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    time_set_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "time_set", key: "id" },
    },
    serial_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false, // e.g. "Period 1", "Lunch Break"
    },
    start_time: {
        type: DataTypes.STRING, // stored as "HH:mm" (24hr) for easy sorting/validation
        allowNull: false,
    },
    end_time: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    is_break: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
}, {
    timestamps: false,
    tableName: "time_slot",
});

TimeSlot.belongsTo(TimeSet, { foreignKey: "time_set_id" });
TimeSet.hasMany(TimeSlot, { foreignKey: "time_set_id" });

module.exports = TimeSlot;
