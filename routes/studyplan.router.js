const express = require("express");
const router = express.Router();
const studyplanController = require("../controllers/studyplan.controller");

router.get("/getAllStudyPlans", studyplanController.getAllStudyPlans);
router.get("/getStudyPlansBySchool/:school_id", studyplanController.getStudyPlansBySchool);
router.get("/getStudyPlansBySchoolAndYear/:school_id/:academic_year", studyplanController.getStudyPlansBySchoolAndYear);
router.get("/getStudyPlanDetail/:school_id/:academic_year", studyplanController.getStudyPlanDetail);
router.delete("/deleteStudyPlan/:id", studyplanController.deleteStudyPlan);

module.exports = router;
