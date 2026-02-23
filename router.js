const express = require("express");
const router = express.Router();

const schoolRoute = require("./routes/school.router");  
const roleRoute = require("./routes/role.router");
const adminRoute = require("./routes/admin.router");
const userRoute = require("./routes/user.router");
const gradeRouter = require('./routes/grade.router');
const sectionRouter = require('./routes/section.router');
const applicationsslcRouter = require('./routes/applicationsslc.router');
const applicationhscRouter = require('./routes/applicationhsc.router');
const groupRouter = require('./routes/group.router');
const studentsslcRouter = require('./routes/studentsslc.router');
const studenthscRouter = require('./routes/studenthsc.router');
const subjectRouter = require('./routes/subject.router');
const sidebarpermissionsRouterRouter = require('./routes/sidebarpermissions.router');
const raiseFeeDemandRouter = require("./routes/RaiseFeeDemand.router");
const feeCollectionRouter = require("./routes/Feecollection.router");

router.use("/user", userRoute);
router.use("/school", schoolRoute);  
router.use("/role", roleRoute);
router.use("/admin", adminRoute);
router.use('/grade', gradeRouter);
router.use('/section', sectionRouter);
router.use("/applicationsslc", applicationsslcRouter);
router.use("/applicationhsc", applicationhscRouter);
router.use("/group", groupRouter);
router.use("/studentsslc", studentsslcRouter);
router.use("/studenthsc", studenthscRouter);
router.use('/subject', subjectRouter);
router.use('/sidebar-permissions', sidebarpermissionsRouterRouter);
router.use('/raiseFeeDemand', raiseFeeDemandRouter);
router.use('/feeCollection', feeCollectionRouter);

module.exports = router;
