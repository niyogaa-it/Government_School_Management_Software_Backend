const express = require("express");
const router = express.Router();
const gradeController = require("../controllers/grade.controller");

router.post("/createGrade", gradeController.createGrade);
router.get("/getAllGrades", gradeController.getAllGrades);
router.get("/getGradesBySchool/:school_id", gradeController.getGradesBySchool);
router.delete("/deleteGrade/:id", gradeController.deleteGrade);
router.put("/updateGrade/:id", gradeController.updateGrade);
router.get("/getGradesBySchoolAndYear/:school_id/:academic_year", gradeController.getGradesBySchoolAndYear);

module.exports = router;