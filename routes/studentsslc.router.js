const express = require('express');
const router  = express.Router();
const studentsslccontroller = require('../controllers/studentsslc.controller');

router.post('/createStudentsslc', studentsslccontroller.createStudentsslc);
router.get('/getAllStudentsslc', studentsslccontroller.getAllStudentsslc);
router.get('/getAllStudentsslcByYear/:year', studentsslccontroller.getAllStudentsslcByYear);
router.get('/getByAdmission/:admissionNumber', studentsslccontroller.getStudentsslcByAdmission);
router.get('/getStudentsslcsBySchool/:school_id', studentsslccontroller.getStudentsslcsBySchool);
router.get('/getStudentsslcsBySchoolAndYear/:school_id/:year', studentsslccontroller.getStudentsslcsBySchoolAndYear);
router.get('/getStudentsslcById/:id', studentsslccontroller.getStudentsslcById);
router.put('/updateStudentsslc/:id', studentsslccontroller.updateStudentsslc);
router.put('/updateStatus/:id', studentsslccontroller.updateStatus);
router.put('/withdrawStudents', studentsslccontroller.withdrawStudents);
router.get('/getTCStudents', studentsslccontroller.getTCStudents);
router.get('/getTCStudentsBySchool/:school_id', studentsslccontroller.getTCStudentsBySchool);
router.get('/getStudentsByGradeYear', studentsslccontroller.getStudentsByGradeYear);
router.get('/getStudentsByFilter', studentsslccontroller.getStudentsByFilter);
router.post('/promoteStudents', studentsslccontroller.promoteStudents);
router.get('/getPromotionHistory/:school_id', studentsslccontroller.getPromotionHistory);
router.post('/demoteStudents', studentsslccontroller.demoteStudents);
router.get("/count", studentsslccontroller.getActiveStudentsslcCount);

// ── Fee due check before TC ──────────────────────────────────────────────────
// POST /studentsslc/checkFeeDuesBeforeTc
// Body: { studentIds: [1, 2, ...], academic_year: "2024-25", school_id: 1 }
// Returns: { hasDues: true/false, studentsWithDues: [{ id, name, admissionNumber, balance_amount }] }
router.post('/checkFeeDuesBeforeTc', studentsslccontroller.checkFeeDuesBeforeTc);

module.exports = router;