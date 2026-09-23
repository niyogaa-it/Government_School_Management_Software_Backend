const express = require("express");
const router = express.Router();
const teacherAllocationController = require("../controllers/teacherAllocation.controller");

router.get("/getFormData/:school_id/:grade_id/:section_id/:academic_year", teacherAllocationController.getFormData);
router.post("/save/:section_id", teacherAllocationController.saveAllocation);
router.get("/getAllAllocations", teacherAllocationController.getAllAllocations);
router.get("/getAllocationsBySchool/:school_id", teacherAllocationController.getAllocationsBySchool);
router.get("/getAllocationsBySchoolAndYear/:school_id/:academic_year", teacherAllocationController.getAllocationsBySchoolAndYear);
router.delete("/deleteAllocation/:section_id", teacherAllocationController.deleteAllocation);

module.exports = router;

// Mount this in your main app/server file next to the other routers, e.g.:
//   app.use("/teacherAllocation", require("./routers/teacherAllocation.router"));
