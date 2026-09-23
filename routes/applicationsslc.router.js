const express = require('express');
const router = express.Router();
const applicationsslccontroller = require('../controllers/applicationsslc.controller');

router.post('/createApplicationsslc',                       applicationsslccontroller.createApplicationsslc);
router.get('/getAllApplicationsslc',                         applicationsslccontroller.getAllApplicationsslc);
router.get('/getApplicationsslcsBySchool/:school_id',        applicationsslccontroller.getApplicationsslcsBySchool);
router.get('/getApplicationsslcById/:id',                    applicationsslccontroller.getApplicationsslcById);
router.post('/admit/:applicationId',                         applicationsslccontroller.admitStudent);
router.put('/updateApplicationsslc/:id',                     applicationsslccontroller.updateApplicationsslc);
router.put('/updateStatus/:id',                              applicationsslccontroller.updateStatus);
router.post('/collectFee/:id',                               applicationsslccontroller.collectApplicationFee);
router.get('/getFeeStatus/:id',                              applicationsslccontroller.getApplicationFeeStatus);

module.exports = router;