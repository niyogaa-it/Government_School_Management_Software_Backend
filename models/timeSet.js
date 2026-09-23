const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");

const TimeSet = sequelize.define("TimeSet", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    school_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "school", key: "id" },
    },
    academic_year: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
}, {
    timestamps: false,
    tableName: "time_set",
});

TimeSet.belongsTo(School, { foreignKey: "school_id" });

module.exports = TimeSet;
