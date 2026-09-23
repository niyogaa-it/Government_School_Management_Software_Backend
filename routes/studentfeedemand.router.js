const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/studentfeedemand.controller");

// Raise demand for a single student
router.post("/raiseForStudent", ctrl.raiseForStudent);

// Raise demand in bulk (whole grade / section / medium / studentType)
router.post("/raiseBulk", ctrl.raiseBulk);

// List demands with filters (?school_id=&academic_year=&grade=&section=&status=&course=)
router.get("/list", ctrl.getDemands);

// Get fee types already raised for a specific student
// GET /studentFeeDemand/raisedTypes?school_id=&academic_year=&admission_number=
router.get("/raisedTypes", ctrl.getRaisedFeeTypesForStudent);

// Get full demand summary for a student
// GET /studentFeeDemand/summary?school_id=&academic_year=&admission_number=
router.get("/summary", ctrl.getStudentDemandSummary);

// Record a payment → generates FeeCollection receipt + updates demand status
router.post("/recordPayment/:id", ctrl.recordPayment);

// Delete a demand (optionally also deletes linked receipts with ?deleteReceipts=true)
router.delete("/delete/:id", ctrl.deleteDemand);

// Get one demand (keep last to avoid catching named routes above)
router.get("/:id", ctrl.getById);

module.exports = router;
