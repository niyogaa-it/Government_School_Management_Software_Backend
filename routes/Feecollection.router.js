const express = require("express");
const router = express.Router();
const feeCollectionController = require("../controllers/Feecollection.controller");

router.get("/nextReceipt", feeCollectionController.getNextReceipt);
router.post("/saveFeeCollection", feeCollectionController.saveFeeCollection);
router.get("/getDailyCollection", feeCollectionController.getDailyCollection);
router.get("/getCollectionByRange", feeCollectionController.getCollectionByRange);
router.get("/getByReceipt/:receiptNo", feeCollectionController.getByReceipt);
router.get("/getAllBySchool/:school_id", feeCollectionController.getAllBySchool);

// ✅ NEW: Admin route — fetches ALL records across all schools
router.get("/getAllRecords", feeCollectionController.getAllRecords);

module.exports = router;