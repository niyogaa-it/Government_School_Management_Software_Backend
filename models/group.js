const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");

const Group = sequelize.define("group", {
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
    availableGroups: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    timestamps: false,
    tableName: "group",
});

Group.belongsTo(School, { foreignKey: "school_id" });
Group.belongsTo(Grade, { foreignKey: "grade_id" });

module.exports = Group;