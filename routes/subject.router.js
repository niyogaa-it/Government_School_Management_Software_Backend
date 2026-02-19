const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.controller");

// POST - Create Subject
router.post("/createSubject", subjectController.createSubject);
router.get("/getAllSubjects", subjectController.getAllSubjects);
router.get("/getSubjectsBySchoolGradeSection/:schoolId/:gradeId/:sectionId",subjectController.getSubjectsBySchoolGradeSection);
router.put("/updateStatus/:id",subjectController.updateStatus);
router.put("/updateSubject/:id", subjectController.updateSubject);
router.get("/getSubjectsBySchoolAndGrade/:schoolId/:gradeId",subjectController.getSubjectsBySchoolAndGrade);

module.exports = router;
