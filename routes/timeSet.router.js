const express = require("express");
const router = express.Router();
const timeSetController = require("../controllers/timeSet.controller");

// Time Set (header)
router.post("/createTimeSet", timeSetController.createTimeSet);
router.get("/getAllTimeSets", timeSetController.getAllTimeSets);
router.get("/getTimeSetsBySchool/:school_id", timeSetController.getTimeSetsBySchool);
router.get("/getTimeSetsBySchoolAndYear/:school_id/:academic_year", timeSetController.getTimeSetsBySchoolAndYear);
router.get("/getTimeSetById/:id", timeSetController.getTimeSetById);
router.put("/updateTimeSet/:id", timeSetController.updateTimeSet);
router.delete("/deleteTimeSet/:id", timeSetController.deleteTimeSet);

// Time Slots (periods / breaks)
router.post("/addTimeSlot", timeSetController.addTimeSlot);
router.put("/updateTimeSlot/:id", timeSetController.updateTimeSlot);
router.delete("/deleteTimeSlot/:id", timeSetController.deleteTimeSlot);

// Section assignment (Manage Time Set)
router.get("/getSectionsForTimeSet/:time_set_id/:school_id/:academic_year", timeSetController.getSectionsForTimeSet);
router.put("/saveSectionAssignments/:time_set_id", timeSetController.saveSectionAssignments);
router.get("/getTimeSlotsForSection/:section_id", timeSetController.getTimeSlotsForSection);

module.exports = router;