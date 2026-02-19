const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");

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
        references: {
            model: "school",
            key: "id",
        },
    },
    grade_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "grade",
            key: "id",
        },
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
},
    // {
    //     tableName: "section",
    //     timestamps: false,
    //     indexes: [
    //         {
    //             unique: true,
    //             fields: ["school_id", "academicYear", "grade_id", "sectionName"] // ✅ DB safety
    //         }
    //     ]
    // });

    {
        timestamps: false,
        tableName: "section",
    });

Section.belongsTo(School, { foreignKey: "school_id" });
Section.belongsTo(Grade, { foreignKey: "grade_id" });

module.exports = Section;
