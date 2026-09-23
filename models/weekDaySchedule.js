const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");

const WeekDaySchedule = sequelize.define("WeekDaySchedule", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    school_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "school", key: "id" } },
    academic_year: { type: DataTypes.STRING, allowNull: false },
    grade_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "grade", key: "id" } },
    section_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "section", key: "id" } },
    applicable_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
    timestamps: false,
    tableName: "week_day_schedule",
});

WeekDaySchedule.belongsTo(School, { foreignKey: "school_id" });
WeekDaySchedule.belongsTo(Grade, { foreignKey: "grade_id" });
WeekDaySchedule.belongsTo(Section, { foreignKey: "section_id" });

module.exports = WeekDaySchedule;