const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructor.controller");

router.post("/createInstructor", instructorController.createInstructor);
router.get("/getAllInstructors", instructorController.getAllInstructors);
router.get("/getInstructorsBySchool/:school_id", instructorController.getInstructorsBySchool);
router.get("/getInstructorById/:id", instructorController.getInstructorById);
router.put("/updateInstructor/:id", instructorController.updateInstructor);
router.delete("/deleteInstructor/:id", instructorController.deleteInstructor);

module.exports = router;