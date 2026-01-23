const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Role = require("./role");

const SidebarPermission = sequelize.define("SidebarPermission", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "role",
      key: "id",
    },
  },
  menuKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
}, {
  timestamps: false,
  tableName: "sidebar_permissions",
});

// Define association with Role
SidebarPermission.belongsTo(Role, { foreignKey: "role_id" });

module.exports = SidebarPermission;