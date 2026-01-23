const express = require("express");
const router = express.Router();

const schoolcontroller = require("../controllers/school.controller");
const rolecontroller = require("../controllers/role.controller");
const admincontroller = require("../controllers/admin.controller");
const applicationsslccontroller = require('../controllers/applicationsslc.controller');
const applicationhsccontroller = require('../controllers/applicationhsc.controller');
const groupController = require("../controllers/group.controller");
const studentsslccontroller = require('../controllers/studentsslc.controller');
const studenthsccontroller = require('../controllers/studenthsc.controller');
const controller = require("../controllers/sidebarpermission.controller");

router.post('/createRole', rolecontroller.createRole);


router.get("/:roleId", controller.getPermissionsByRole);
router.post("/:roleId", controller.setPermissionsForRole);

router.get("/getRolesBySchool/:school_id", rolecontroller.getRolesBySchool);
router.get("/getAllSchools", schoolcontroller.getAllSchools);
router.get("/getSchool/:id", schoolcontroller.getSchoolById);
router.post("/createSchool", schoolcontroller.createSchool);

router.get("/getAllAdmins", admincontroller.getAllAdmin);
router.post("/createAdmin", admincontroller.createAdmin); 
router.post("/login", admincontroller.login);
router.delete("/deleteAdmin/:id", admincontroller.deleteAdmin);
router.put("/updateAdmin/:id", admincontroller.updateAdmin);

router.post('/createApplicationsslc', applicationsslccontroller.createApplicationsslc);
router.get('/getAllApplicationsslc', applicationsslccontroller.getAllApplicationsslc);
router.get('/getApplicationsslcsBySchool/:school_id', applicationsslccontroller.getApplicationsslcsBySchool);
router.post("/admit/:applicationId", applicationsslccontroller.admitStudent);
router.get('/getApplicationsslcById/:id', applicationsslccontroller.getApplicationsslcById);
router.put('/updateApplicationsslc/:id', applicationsslccontroller.updateApplicationsslc);

router.post('/createApplicationhsc', applicationhsccontroller.createApplicationhsc);
router.get('/getAllApplicationhsc', applicationhsccontroller.getAllApplicationhsc);
router.get('/getApplicationhscsBySchool/:school_id', applicationhsccontroller.getApplicationhscsBySchool);
router.post("/admit/:applicationId", applicationhsccontroller.admitStudent);
router.get("/getApplicationhscById/:id",applicationhsccontroller.getApplicationhscById);
router.put('/updateApplicationhsc/:id', applicationhsccontroller.updateApplicationhsc);

router.post("/createGroup", groupController.createGroup);
router.get("/getAllGroups", groupController.getAllGroups);
router.get("/getGroupsBySchool/:school_id", groupController.getGroupsBySchool);
router.put("/updateGroup/:id", groupController.updateGroup);
router.get("/getGroup/:id", groupController.getGroupById);
router.delete("/deleteGroup/:id", groupController.deleteGroup);
router.get("/getGroupsByGrade/:grade_id", groupController.getGroupsByGrade);

router.post('/createStudentsslc', studentsslccontroller.createStudentsslc);
router.get('/getAllStudentsslc', studentsslccontroller.getAllStudentsslc);
router.get('/getStudentsslcsBySchool/:school_id', studentsslccontroller.getStudentsslcsBySchool);
router.get("/getStudentsslcById/:id",studentsslccontroller.getStudentsslcById);
router.put("/updateStudentsslc/:id", studentsslccontroller.updateStudentsslc);

router.post('/createStudenthsc', studenthsccontroller.createStudenthsc);
router.get('/getAllStudenthsc', studenthsccontroller.getAllStudenthsc);
router.get('/getStudenthscsBySchool/:school_id', studenthsccontroller.getStudenthscsBySchool);
router.get("/getStudenthscById/:id",studenthsccontroller.getStudenthscById);
router.put("/updateStudenthsc/:id", studenthsccontroller.updateStudenthsc);


module.exports = router;
