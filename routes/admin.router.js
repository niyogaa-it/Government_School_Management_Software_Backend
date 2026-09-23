const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin.controller");

router.get("/getAdminsBySchool/:school_id", admincontroller.getAdminsBySchool);
router.get("/getAllAdmins",                 admincontroller.getAllAdmin);
router.get("/getAdminById/:id",            admincontroller.getAdminById);
router.post("/createAdmin",                admincontroller.createAdmin);
router.post("/login",                      admincontroller.login);
router.put("/updateAdmin/:id",             admincontroller.updateAdmin);
router.put("/changePassword/:id",          admincontroller.changePassword);  // ✅ Logged-in user changes own password
router.put("/resetPassword/:id",           admincontroller.resetPassword);   // ✅ Superadmin resets any user's password
router.delete("/deleteAdmin/:id",          admincontroller.deleteAdmin);

module.exports = router;