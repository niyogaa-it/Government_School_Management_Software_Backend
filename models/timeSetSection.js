const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TimeSet = require("./timeSet");
const Section = require("./section");

const TimeSetSection = sequelize.define("TimeSetSection", {
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
    section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "section", key: "id" },
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
}, {
    timestamps: false,
    tableName: "time_set_section",
});

TimeSetSection.belongsTo(TimeSet, { foreignKey: "time_set_id" });
TimeSetSection.belongsTo(Section, { foreignKey: "section_id" });
TimeSet.hasMany(TimeSetSection, { foreignKey: "time_set_id" });
Section.hasMany(TimeSetSection, { foreignKey: "section_id" });

module.exports = TimeSetSection;
