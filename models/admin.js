const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Role = require("./role");

const Admin = sequelize.define("Admin", {
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
        allowNull: true,
        references: {
            model: "school",  
            key: "id",
        },
    },
    mobileNumber: {
        type: DataTypes.BIGINT,  
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role_id: {  
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "role", 
            key: "id",
        },
    },
    status: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
}, {
    timestamps: false,
    tableName: "admin_form",
     defaultScope: {
        where: { status: 1 } 
     }
});

Admin.belongsTo(School, { foreignKey: "school_id" });
Admin.belongsTo(Role, { foreignKey: "role_id" });

module.exports = Admin;