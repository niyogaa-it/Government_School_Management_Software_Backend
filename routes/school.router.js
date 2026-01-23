const express = require("express");
const router = express.Router();

// ✅ Make sure this matches the actual file name
const schoolcontroller = require("../controllers/school.controller");

router.get("/getAllSchools", schoolcontroller.getAllSchools);
router.get("/getSchool/:id", schoolcontroller.getSchoolById); 
router.post("/createSchool", schoolcontroller.createSchool);
router.delete("/deleteSchool/:id", schoolcontroller.deleteSchool);

module.exports = router;
