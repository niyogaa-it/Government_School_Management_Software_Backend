// controller/sidebarpermission.controller.js
const SidebarPermission = require('../models/sidebarpermission');

exports.getPermissionsByRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const permissions = await SidebarPermission.findAll({
      where: { role_id: roleId },
    });

    res.json({ permissions });
  } catch (error) {
    console.error("Error fetching sidebar permissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.setPermissionsForRole = async (req, res) => {
  try {
    const roleId = req.params.roleId;
    const input = req.body;

    if (!roleId) {
      return res.status(400).json({ error: "Role ID is required" });
    }

    await SidebarPermission.destroy({ where: { role_id: roleId } });

    const toCreate = input.map((item) => ({
      ...item,
      role_id: roleId,
    }));

    await SidebarPermission.bulkCreate(toCreate);

    res.json({ message: "Permissions updated successfully" });
  } catch (err) {
    console.error("Error setting permissions:", err);
    res.status(500).json({ error: "Failed to save permissions" });
  }
};
