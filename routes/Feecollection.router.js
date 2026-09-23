const express = require("express");
const router = express.Router();
const feeCollectionController = require("../controllers/Feecollection.controller");

router.get("/nextReceipt", feeCollectionController.getNextReceipt);
router.get("/getSchool/:school_id", feeCollectionController.getSchoolById);
router.post("/saveFeeCollection", feeCollectionController.saveFeeCollection);
router.get("/getDailyCollection", feeCollectionController.getDailyCollection);
router.get(
  "/getCollectionByRange",
  feeCollectionController.getCollectionByRange,
);
router.get("/getByReceipt/:receiptNo", feeCollectionController.getByReceipt);
router.get(
  "/getAllBySchool/:school_id",
  feeCollectionController.getAllBySchool,
);
router.get("/getGradeSummary", feeCollectionController.getGradeSummary);
// Admin route — fetches ALL records across all schools
router.get("/getAllRecords", feeCollectionController.getAllRecords);

// Update a fee collection record by ID
router.put("/update/:id", feeCollectionController.updateFeeCollection);

// ── Balance carry-forward routes ─────────────────────────────────────────────
// Returns totalPaid for a student+year+feeTypes so frontend can compute balance
router.get("/getStudentBalance", feeCollectionController.getStudentFeeBalance);

// Returns full receipt history grouped by fee type for a student
router.get("/getStudentHistory", feeCollectionController.getStudentFeeHistory);

module.exports = router;