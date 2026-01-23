const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin.controller");

router.get("/getAdminsBySchool/:school_id", admincontroller.getAdminsBySchool);  
router.get("/getAllAdmins", admincontroller.getAllAdmin);
router.post("/createAdmin", admincontroller.createAdmin);
router.post("/login", admincontroller.login);
router.delete("/deleteAdmin/:id", admincontroller.deleteAdmin);
router.put("/updateAdmin/:id", admincontroller.updateAdmin);
router.get("/getAdminById/:id", admincontroller.getAdminById);

module.exports = router;
