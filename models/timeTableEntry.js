const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TimeTable = require("./timeTable");
const Section = require("./section");
const Subject = require("./Subject");
const Instructor = require("./instructor");
const TimeSlot = require("./timeSlot");

const TimeTableEntry = sequelize.define("TimeTableEntry", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    time_table_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "time_table", key: "id" } },
    section_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "section", key: "id" } },
    day_of_week: {
        type: DataTypes.ENUM("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
        allowNull: false,
    },
    time_slot_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "time_slot", key: "id" } },
    subject_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "subject", key: "id" } },
    instructor_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "instructor", key: "id" } },
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // Shared across every entry that's part of the same "combined class"
    // session — same subject/instructor/day/slot spread across multiple
    // sections (e.g. Grade 2-A + Grade 2-B taking English together).
    // Null = this entry is not part of a combined class.
    group_id: { type: DataTypes.STRING(36), allowNull: true },
}, {
    timestamps: false,
    tableName: "time_table_entry",
});

TimeTableEntry.belongsTo(TimeTable, { foreignKey: "time_table_id" });
TimeTableEntry.belongsTo(Section, { foreignKey: "section_id" });
TimeTableEntry.belongsTo(Subject, { foreignKey: "subject_id" });
TimeTableEntry.belongsTo(Instructor, { foreignKey: "instructor_id" });
TimeTableEntry.belongsTo(TimeSlot, { foreignKey: "time_slot_id" });
TimeTable.hasMany(TimeTableEntry, { foreignKey: "time_table_id" });

module.exports = TimeTableEntry;