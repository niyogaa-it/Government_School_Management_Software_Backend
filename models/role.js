const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");

const Role = sequelize.define("Role", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    roleOfUser: {
        type: DataTypes.STRING,
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
    status: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },

}, {
    timestamps: false,
    tableName: "role",
});

// ✅ Define relationship
Role.belongsTo(School, { foreignKey: "school_id" });

module.exports = Role;
