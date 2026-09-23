// routes/attendancehsc.router.js
const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/attendancehsc.controller");

// GET  HSC grades (XI & XII) for a school + academicYear
router.get("/getHSCGrades",             controller.getHSCGrades);

// GET  students to show in attendance sheet
router.get("/getStudentsForAttendance", controller.getStudentsForAttendance);

// GET  existing absent records for a slot (school+grade+section+date+session)
router.get("/getAttendance",            controller.getAttendance);

// POST submit (or re-submit) attendance for a slot
router.post("/submitAttendance",        controller.submitAttendance);

// GET  attendance summary / history
router.get("/getSummary",               controller.getAttendanceSummary);

module.exports = router;
