const express = require("express");
const router = express.Router();
const raiseFeeDemandController = require("../controllers/RaiseFeeDemand.controller");

// POST - Raise a new fee demand
router.post("/createraiseFeeDemand", raiseFeeDemandController.createFeeDemand);
router.get("/getAllFeeDemand", raiseFeeDemandController.getAllFeeDemand);


module.exports = router;
