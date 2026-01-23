const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const School = sequelize.define("School", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    shortcode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    pincode: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
            type: DataTypes.INTEGER,
            defaultValue: 1
    },

}, {
    timestamps: false,
    tableName: "school",
});

module.exports = School;
