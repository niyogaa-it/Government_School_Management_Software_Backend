const express = require('express');
const router  = express.Router();
const studenthsccontroller = require('../controllers/studenthsc.controller');

router.post('/createStudenthsc',                                         studenthsccontroller.createStudenthsc);
router.get('/getAllStudenthsc',                                           studenthsccontroller.getAllStudenthsc);
router.get('/getAllStudenthscByYear/:year',                               studenthsccontroller.getAllStudenthscByYear);
router.get('/getStudenthscsBySchool/:school_id',                          studenthsccontroller.getStudenthscsBySchool);
router.get('/getByAdmission/:admissionNumber',                            studenthsccontroller.getStudenthscByAdmission);
router.get('/getStudenthscById/:id',                                      studenthsccontroller.getStudenthscById);
router.get('/getStudenthscsBySchoolAndYear/:school_id/:year',             studenthsccontroller.getStudenthscsBySchoolAndYear);
router.get('/getStudentsByGradeYear',                                     studenthsccontroller.getStudentsByGradeYear);
router.get('/getStudentsByFilter',                                        studenthsccontroller.getStudentsByFilter);
router.put('/updateStudenthsc/:id',                                       studenthsccontroller.updateStudenthsc);
router.put('/updateStatus/:id',                                           studenthsccontroller.updateStatus);
router.put('/withdrawStudents',                                           studenthsccontroller.withdrawStudents);
router.get('/getTCStudents',                                              studenthsccontroller.getTCStudents);
router.get('/getTCStudentsBySchool/:school_id',                           studenthsccontroller.getTCStudentsBySchool);
router.post('/promoteStudents',                                           studenthsccontroller.promoteStudents);
router.post('/demoteStudents',                                            studenthsccontroller.demoteStudents);
router.get('/getPromotionHistory/:school_id',                             studenthsccontroller.getPromotionHistory);
router.delete('/deleteStudenthsc/:id',                                    studenthsccontroller.deleteStudenthsc);
router.get("/count",                                                      studenthsccontroller.getActiveStudenthscCount);

// ── Fee due check before TC ──────────────────────────────────────────────────
// POST /studenthsc/checkFeeDuesBeforeTc
// Body: { studentIds: [1, 2, ...], academic_year: "2024-25", school_id: 1 }
// Returns: { hasDues: true/false, studentsWithDues: [{ id, name, admissionNumber, balance_amount, pendingFeeTypes }] }
router.post('/checkFeeDuesBeforeTc',                                      studenthsccontroller.checkFeeDuesBeforeTc);

module.exports = router;