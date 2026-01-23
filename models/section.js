const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");

const Section = sequelize.define( "section", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    school_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "school",  
            key: "id",
        },
    },
    grade_id: {  
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "grade", 
            key: "id",
        },
    },
    sectionName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    shortCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    },
    {
        timestamps: false,
        tableName: "section",
    });

Section.belongsTo(School, { foreignKey: "school_id" });
Section.belongsTo(Grade, { foreignKey: "grade_id" });

module.exports = Section;
