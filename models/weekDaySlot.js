const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const WeekDaySchedule = require("./weekDaySchedule");
const TimeSet = require("./timeSet");

const WeekDaySlot = sequelize.define("WeekDaySlot", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    week_day_schedule_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "week_day_schedule", key: "id" } },
    day_of_week: {
        type: DataTypes.ENUM("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
        allowNull: false,
    },
    time_set_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "time_set", key: "id" } },
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
    timestamps: false,
    tableName: "week_day_slot",
});

WeekDaySlot.belongsTo(WeekDaySchedule, { foreignKey: "week_day_schedule_id" });
WeekDaySlot.belongsTo(TimeSet, { foreignKey: "time_set_id" });
WeekDaySchedule.hasMany(WeekDaySlot, { foreignKey: "week_day_schedule_id" });

module.exports = WeekDaySlot;