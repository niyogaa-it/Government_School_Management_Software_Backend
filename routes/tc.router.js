// routers/tc.router.js
const express = require("express");
const router = express.Router();
const tcController = require("../controllers/tc.controller");

router.post("/bulkIssueTc",                             tcController.bulkIssueTc);
router.get("/getAllTcs",                                 tcController.getAllTcs);
router.get("/getTcsBySchool/:school_id",                tcController.getTcsBySchool);
router.get("/getTcsBySchoolAndYear/:school_id/:year",   tcController.getTcsBySchoolAndYear);
router.get("/getTcsByYear/:year",                       tcController.getTcsByYear);
router.get("/getTcById/:id",                            tcController.getTcById);
router.put("/cancelTc/:id",                             tcController.cancelTc);

module.exports = router;