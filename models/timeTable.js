const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");

const TimeTable = sequelize.define("TimeTable", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    school_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "school", key: "id" } },
    academic_year: { type: DataTypes.STRING, allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
    timestamps: false,
    tableName: "time_table",
});

TimeTable.belongsTo(School, { foreignKey: "school_id" });

module.exports = TimeTable;