// routers/tchsc.router.js
const express    = require("express");
const router     = express.Router();
const tchscCtrl  = require("../controllers/tchsc.controller");

router.post("/bulkIssueTc",                                    tchscCtrl.bulkIssueTc);
router.get("/getAllTcs",                                        tchscCtrl.getAllTcs);
router.get("/getTcsBySchool/:school_id",                       tchscCtrl.getTcsBySchool);
router.get("/getTcsBySchoolAndYear/:school_id/:year",          tchscCtrl.getTcsBySchoolAndYear);  
router.get("/getTcById/:id",                                   tchscCtrl.getTcById);
router.put("/cancelTc/:id",                                    tchscCtrl.cancelTc);

module.exports = router;