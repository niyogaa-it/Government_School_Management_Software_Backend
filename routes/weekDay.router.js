const express = require("express");
const router = express.Router();
const weekDayController = require("../controllers/weekDay.controller");

router.get("/getTimeSetsForSection/:section_id", weekDayController.getTimeSetsForSection);
router.post("/createWeekDaySchedule", weekDayController.createWeekDaySchedule);
router.get("/getAllWeekDaySchedules", weekDayController.getAllWeekDaySchedules);
router.get("/getWeekDayScheduleById/:id", weekDayController.getWeekDayScheduleById);
router.put("/updateWeekDaySchedule/:id", weekDayController.updateWeekDaySchedule);
router.delete("/deleteWeekDaySchedule/:id", weekDayController.deleteWeekDaySchedule);
router.get("/getPeriodsForSection/:section_id", weekDayController.getPeriodsForSection);

module.exports = router;