const express = require("express");
const router = express.Router();
const raiseFeeDemandController = require("../controllers/RaiseFeeDemand.controller");

// POST - Create a new fee demand
router.post("/createraiseFeeDemand", raiseFeeDemandController.createFeeDemand);

// GET - Fetch all fee demands
router.get("/getAllFeeDemand", raiseFeeDemandController.getAllFeeDemand);

// GET - Fetch single fee demand by id
router.get("/getFeeDemand/:id", raiseFeeDemandController.getFeeDemandById);

// PUT - Update a specific fee entry inside a demand (by feeIndex in body)
router.put("/updateFeeDemand/:id", raiseFeeDemandController.updateFeeDemand);

// DELETE - Remove a specific fee entry by feeIndex (?feeIndex=0)
router.delete("/deleteFeeEntry/:id", raiseFeeDemandController.deleteFeeEntry);

// GET - Fetch fee demands by school + academic year (used by fee collection form)
router.get("/getBySchoolAndYear/:school_id/:academicYear", raiseFeeDemandController.getBySchoolAndYear);

// DELETE - Remove the entire fee demand record
router.delete("/deleteFeeDemand/:id", raiseFeeDemandController.deleteFeeDemand);

module.exports = router;