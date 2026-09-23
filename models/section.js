const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Section = sequelize.define("section", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    school_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "school", key: "id" },
    },
    academic_year: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    grade_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "grade", key: "id" },
    },
    sectionName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    shortCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    timestamps: false,
    tableName: "section",
});

module.exports = Section;

// Section.belongsTo(School, { foreignKey: "school_id" });
// Section.belongsTo(Grade, { foreignKey: "grade_id" });

