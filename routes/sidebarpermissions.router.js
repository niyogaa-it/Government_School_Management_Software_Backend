const express = require("express");
const router = express.Router();
const { SidebarPermission } = require('../models');
const controller = require("../controllers/sidebarpermission.controller");

router.get("/:roleId", controller.getPermissionsByRole);
router.post("/:roleId", controller.setPermissionsForRole);

module.exports = router;
