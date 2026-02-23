const RaiseFeeDemand = require("../models/raisefeedemand");

const controller = {};

/* ============================================================
   CREATE FEE DEMAND  (FULL & CORRECT)
=============================================================== */
controller.createFeeDemand = async (req, res) => {
  try {
    const { school_id, academicYear, grade_ids, feeDetails } = req.body;

    if (!school_id || !academicYear || !grade_ids || !feeDetails) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    //  Save FULL fee detail structure
    const enrichedFeeDetails = feeDetails.map(fee => ({
      grade: fee.grade,                
      grade_id: fee.grade_id,
      type: fee.type,                  
      description: fee.description,    
      studentType: fee.studentType,    
      medium: fee.medium,              
      amount: fee.amount               
    }));

    // Total
    const total_amount = enrichedFeeDetails.reduce(
      (sum, fee) => sum + parseFloat(fee.amount || 0), 
      0
    );

    // Save demand
    const newDemand = await RaiseFeeDemand.create({
      school_id,
      academic_year: academicYear,
      selected_grades: grade_ids,
      fee_details: enrichedFeeDetails,
      total_amount,
    });

    res.status(201).json({
      message: "Fee demand created successfully",
      data: newDemand
    });

  } catch (error) {
    console.error("Error creating fee demand:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

/* ============================================================
   GET ALL FEE DEMANDS
=============================================================== */
controller.getAllFeeDemand = async (req, res) => {
  try {
    const demands = await RaiseFeeDemand.findAll();
    res.status(200).json({ message: "Fetched", data: demands });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = controller;