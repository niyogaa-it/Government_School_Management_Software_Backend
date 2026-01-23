const express = require("express");
const router = express.Router();
const sectionController = require("../controllers/section.controller");

router.post("/createSection", sectionController.createSection);
router.get("/getAllSections", sectionController.getAllSections);
router.get("/getSectionsBySchool/:school_id", sectionController.getSectionsBySchool);
// router.get('/getSectionsByGrade/:grade_id', sectionController.getSectionsByGrade);
// router.get("/getSectionsBySchoolAndGrade/:school_id/:grade_id",sectionController.getSectionsBySchoolAndGrade);
router.get("/getSectionsBySchoolAndGrade/:school_id/:grade_id", sectionController.getSectionsBySchoolAndGrade);
router.get("/getSectionById/:id", sectionController.getSectionById);
router.put("/updateSection/:id", sectionController.updateSection);
router.put("/updateStatus/:id", sectionController.updateStatus);

module.exports = router;