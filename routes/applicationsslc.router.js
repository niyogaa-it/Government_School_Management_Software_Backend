const express = require('express');
const router = express.Router();
const applicationsslccontroller = require('../controllers/applicationsslc.controller');

router.post('/createApplicationsslc', applicationsslccontroller.createApplicationsslc);
router.get('/getAllApplicationsslc', applicationsslccontroller.getAllApplicationsslc);
router.get('/getApplicationsslcsBySchool/:school_id', applicationsslccontroller.getApplicationsslcsBySchool);
router.get('/getApplicationsslcById/:id', applicationsslccontroller.getApplicationsslcById); // ✅ This line
router.post('/admit/:applicationId', applicationsslccontroller.admitStudent);
router.put('/updateApplicationsslc/:id', applicationsslccontroller.updateApplicationsslc);


module.exports = router;