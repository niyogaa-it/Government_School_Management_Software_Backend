const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");


const Grade = sequelize.define("Grade", {
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
    grade: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, 
    },
}, {
    timestamps: false,
    tableName: "grade",
});

Grade.belongsTo(School, { foreignKey: "school_id" });

module.exports = Grade;