const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.controller");

// POST - Create Subject
router.post("/createSubject", subjectController.createSubject);

// GET - Get All Subjects
router.get("/getAllSubjects", subjectController.getAllSubjects);

// ✅ GET - Get Subjects by School, Grade, and Section
// routes/subject.router.js
router.get(
    "/getSubjectsBySchoolGradeSection/:schoolId/:gradeId/:sectionId",
    subjectController.getSubjectsBySchoolGradeSection
  );

module.exports = router;
