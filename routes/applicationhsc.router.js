const express = require('express');
const router = express.Router();
const applicationhsccontroller = require('../controllers/applicationhsc.controller');

router.post('/createApplicationhsc', applicationhsccontroller.createApplicationhsc);
router.get('/getAllApplicationhsc', applicationhsccontroller.getAllApplicationhsc);
router.get('/getApplicationhscsBySchool/:school_id', applicationhsccontroller.getApplicationhscsBySchool);
router.post("/admit/:applicationId", applicationhsccontroller.admitStudent);
router.get("/getApplicationhscById/:id",applicationhsccontroller.getApplicationhscById);
router.put('/updateApplicationhsc/:id', applicationhsccontroller.updateApplicationhsc);

module.exports = router;