const express = require("express");
const router = express.Router();
const timeTableController = require("../controllers/timeTable.controller");

router.post("/createTimeTable", timeTableController.createTimeTable);
router.get("/getTimeTablesForSchool/:school_id/:academic_year", timeTableController.getTimeTablesForSchool);
router.get("/getAllTimeTables", timeTableController.getAllTimeTables);
router.get("/getTimeTablesBySchool/:school_id", timeTableController.getTimeTablesBySchool);
router.get("/getTimeTableById/:id", timeTableController.getTimeTableById);
router.put("/updateTimeTable/:id", timeTableController.updateTimeTable);
router.delete("/deleteTimeTable/:id", timeTableController.deleteTimeTable);

router.post("/addTimeTableEntry", timeTableController.addTimeTableEntry);
router.delete("/deleteTimeTableEntry/:id", timeTableController.deleteTimeTableEntry);
router.get("/getEntriesForSection/:time_table_id/:section_id", timeTableController.getEntriesForSection);

module.exports = router;