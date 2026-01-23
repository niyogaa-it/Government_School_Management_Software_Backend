const express = require('express');
const router = express.Router();
const studentsslccontroller = require('../controllers/studentsslc.controller');

router.post('/createStudentsslc', studentsslccontroller.createStudentsslc);
router.get('/getAllStudentsslc', studentsslccontroller.getAllStudentsslc);
router.get('/getStudentsslcsBySchool/:school_id', studentsslccontroller.getStudentsslcsBySchool);
router.get("/getStudentsslcById/:id",studentsslccontroller.getStudentsslcById);
router.put("/updateStudentsslc/:id", studentsslccontroller.updateStudentsslc);


module.exports = router;