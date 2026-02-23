const express = require('express');
const router = express.Router();
const studenthsccontroller = require('../controllers/studenthsc.controller');

router.post('/createStudenthsc', studenthsccontroller.createStudenthsc);
router.get('/getAllStudenthsc', studenthsccontroller.getAllStudenthsc);
router.get('/getStudenthscsBySchool/:school_id', studenthsccontroller.getStudenthscsBySchool);
router.get("/getByAdmission/:admissionNumber",studenthsccontroller.getStudenthscByAdmission);
router.get("/getStudenthscById/:id",studenthsccontroller.getStudenthscById);
router.put("/updateStudenthsc/:id", studenthsccontroller.updateStudenthsc);
router.put("/updateStatus/:id", studenthsccontroller.updateStatus);

module.exports = router;
