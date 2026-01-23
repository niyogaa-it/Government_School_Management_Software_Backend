const express = require("express");
const router = express.Router();
const rolecontroller = require("../controllers/role.controller");

router.post("/createRole", rolecontroller.createRole);  
router.get("/getAllRoles", rolecontroller.getAllRoles);
router.get("/getRolesBySchool/:school_id", rolecontroller.getRolesBySchool);
router.delete("/deleteRole/:id", rolecontroller.deleteRole);


module.exports = router;
