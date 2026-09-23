const RaiseFeeDemand = require("../models/raisefeedemand");

const controller = {};

/* ============================================================
   CREATE FEE DEMAND
=============================================================== */
controller.createFeeDemand = async (req, res) => {
  try {
    const { school_id, academicYear, grade_ids, feeDetails } = req.body;

    if (!school_id || !academicYear || !grade_ids || !feeDetails) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const enrichedFeeDetails = feeDetails.map(fee => ({
      grade: fee.grade,
      grade_id: fee.grade_id,
      type: fee.type,
      description: fee.description,
      studentType: fee.studentType,
      medium: fee.medium,
      amount: fee.amount,
      course: fee.course || null,          // preserve course so getBySchoolAndYear can filter it
      academic_year: academicYear,         // embed year so each fee item is self-describing
    }));

    const total_amount = enrichedFeeDetails.reduce(
      (sum, fee) => sum + parseFloat(fee.amount || 0),
      0
    );

    // Check if a demand already exists for this school+year — if so, MERGE fee details
    // instead of creating a duplicate record
    const existing = await RaiseFeeDemand.findOne({
      where: { school_id, academic_year: academicYear },
      order: [["id", "DESC"]],
    });

    if (existing) {
      // Merge: existing fee_details + new ones, deduplicating by type+grade+medium+studentType
      let existingDetails = existing.fee_details;
      if (typeof existingDetails === "string") {
        try { existingDetails = JSON.parse(existingDetails); } catch { existingDetails = []; }
      }
      const mergeMap = {};
      // Put existing first, then new ones overwrite (new = latest wins)
      [...existingDetails, ...enrichedFeeDetails].forEach((fee) => {
        const key = `${fee.type}|${fee.grade}|${fee.medium}|${fee.studentType}`;
        mergeMap[key] = fee;
      });
      const mergedDetails = Object.values(mergeMap);
      const merged_total  = mergedDetails.reduce((s, f) => s + parseFloat(f.amount || 0), 0);

      await existing.update({ fee_details: mergedDetails, total_amount: merged_total });

      return res.status(200).json({
        message: "Fee demand updated (merged with existing)",
        data: existing,
      });
    }

    const newDemand = await RaiseFeeDemand.create({
      school_id,
      academic_year: academicYear,
      selected_grades: grade_ids,
      fee_details: enrichedFeeDetails,
      total_amount,
    });

    res.status(201).json({
      message: "Fee demand created successfully",
      data: newDemand,
    });
  } catch (error) {
    console.error("Error creating fee demand:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
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

/* ============================================================
   GET FEE DEMAND BY ID
=============================================================== */
controller.getFeeDemandById = async (req, res) => {
  try {
    const { id } = req.params;
    const demand = await RaiseFeeDemand.findByPk(id);

    if (!demand) {
      return res.status(404).json({ message: "Fee demand not found" });
    }

    res.status(200).json({ message: "Fetched", data: demand });
  } catch (error) {
    console.error("Error fetching fee demand by id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================================================
   UPDATE FEE DEMAND (update a specific fee entry by feeIndex)
   PUT /raiseFeeDemand/updateFeeDemand/:id
   Body: { feeIndex, grade, type, description, studentType, medium, amount }
=============================================================== */
controller.updateFeeDemand = async (req, res) => {
  try {
    const { id } = req.params;
    const { feeIndex, grade, type, description, studentType, medium, amount } = req.body;

    if (feeIndex === undefined || feeIndex === null) {
      return res.status(400).json({ message: "feeIndex is required" });
    }

    // Find the record
    const demand = await RaiseFeeDemand.findByPk(id);
    if (!demand) {
      return res.status(404).json({ message: "Fee demand not found" });
    }

    // Parse fee_details
    let details = demand.fee_details;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {
        return res.status(500).json({ message: "Failed to parse fee_details" });
      }
    }

    if (feeIndex < 0 || feeIndex >= details.length) {
      return res.status(400).json({ message: `Invalid feeIndex: ${feeIndex}` });
    }

    // Update only the specific fee entry
    details[feeIndex] = {
      ...details[feeIndex],   // keep existing fields like grade_id
      grade: grade ?? details[feeIndex].grade,
      type: type ?? details[feeIndex].type,
      description: description ?? details[feeIndex].description,
      studentType: studentType ?? details[feeIndex].studentType,
      medium: medium ?? details[feeIndex].medium,
      amount: amount ?? details[feeIndex].amount,
    };

    // Recalculate total
    const total_amount = details.reduce(
      (sum, fee) => sum + parseFloat(fee.amount || 0),
      0
    );

    // Save back
    await RaiseFeeDemand.update(
      { fee_details: details, total_amount },
      { where: { id } }
    );

    const updated = await RaiseFeeDemand.findByPk(id);
    res.status(200).json({ message: "Fee entry updated successfully", data: updated });
  } catch (error) {
    console.error("Error updating fee demand:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ============================================================
   DELETE A SPECIFIC FEE ENTRY (by feeIndex)
   DELETE /raiseFeeDemand/deleteFeeEntry/:id?feeIndex=0
   - If it's the last entry, deletes the whole record
   - Otherwise removes only that entry and recalculates total
=============================================================== */
controller.deleteFeeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const feeIndex = parseInt(req.query.feeIndex);

    if (isNaN(feeIndex)) {
      return res.status(400).json({ message: "feeIndex query param is required" });
    }

    const demand = await RaiseFeeDemand.findByPk(id);
    if (!demand) {
      return res.status(404).json({ message: "Fee demand not found" });
    }

    // Parse fee_details
    let details = demand.fee_details;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {
        return res.status(500).json({ message: "Failed to parse fee_details" });
      }
    }

    if (feeIndex < 0 || feeIndex >= details.length) {
      return res.status(400).json({ message: `Invalid feeIndex: ${feeIndex}` });
    }

    // Remove the specific entry
    details.splice(feeIndex, 1);

    // If no entries left, delete the whole record
    if (details.length === 0) {
      await RaiseFeeDemand.destroy({ where: { id } });
      return res.status(200).json({ message: "Fee demand record deleted (no entries remaining)" });
    }

    // Otherwise recalculate total and save
    const total_amount = details.reduce(
      (sum, fee) => sum + parseFloat(fee.amount || 0),
      0
    );

    await RaiseFeeDemand.update(
      { fee_details: details, total_amount },
      { where: { id } }
    );

    const updated = await RaiseFeeDemand.findByPk(id);
    res.status(200).json({ message: "Fee entry deleted successfully", data: updated });
  } catch (error) {
    console.error("Error deleting fee entry:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ============================================================
   DELETE ENTIRE FEE DEMAND RECORD
   DELETE /raiseFeeDemand/deleteFeeDemand/:id
=============================================================== */
controller.deleteFeeDemand = async (req, res) => {
  try {
    const { id } = req.params;
    const demand = await RaiseFeeDemand.findByPk(id);

    if (!demand) {
      return res.status(404).json({ message: "Fee demand not found" });
    }

    await RaiseFeeDemand.destroy({ where: { id } });
    res.status(200).json({ message: "Fee demand deleted successfully" });
  } catch (error) {
    console.error("Error deleting fee demand:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ============================================================
   GET FEE DEMANDS BY SCHOOL + YEAR  (+ optional filters)
   GET /raiseFeeDemand/getBySchoolAndYear/:school_id/:academicYear
   Optional query params: grade, medium, student_type
   When no params supplied → full unfiltered set (admin fee-structure list page).
============================================================ */
controller.getBySchoolAndYear = async (req, res) => {
  try {
    const { school_id, academicYear } = req.params;

    // ── Query filters sent by RaiseStudentDemand frontend ──────────────────
    const gradeParam       = (req.query.grade        || "").trim();
    const courseParam      = (req.query.course       || "").trim().toUpperCase(); // "SSLC" | "HSC"
    const mediumParam      = (req.query.medium       || "").trim();               // "Tamil" | "English"
    const studentTypeParam = (req.query.student_type || "").trim().toLowerCase(); // "new" | "old"

    console.log(
      `getBySchoolAndYear: school_id=${school_id}, year=${academicYear}, ` +
      `grade=${gradeParam || "ALL"}, course=${courseParam || "ALL"}, ` +
      `medium=${mediumParam || "ALL"}, studentType=${studentTypeParam || "ALL"}`
    );

    // Fetch ALL fee-demand records for this school + year
    const demands = await RaiseFeeDemand.findAll({
      where: {
        school_id:     parseInt(school_id, 10),
        academic_year: academicYear,
      },
    });

    console.log(`getBySchoolAndYear: found=${demands.length} demand records`);

    // ── Flatten fee_details from all records ──────────────────────────────
    const allFeeDetails = [];

    // Sort DESC by id so latest record wins during dedup
    const sortedDemands = [...demands].sort((a, b) => b.id - a.id);

    sortedDemands.forEach((d) => {
      let details = d.fee_details;
      if (typeof details === "string") {
        try { details = JSON.parse(details); } catch { details = []; }
      }
      if (Array.isArray(details)) {
        details.forEach((fee) => {
          allFeeDetails.push({ ...fee, school_id: d.school_id, demand_id: d.id });
        });
      }
    });

    // ── Deduplicate: keep only latest entry per type+grade+medium+studentType ──
    const deduped = [];
    const seen    = new Set();
    for (const fee of allFeeDetails) {
      const key = `${fee.school_id}|${fee.type}|${fee.grade}|${fee.medium}|${fee.studentType}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(fee);
      }
    }

    // ── Apply filters so only the exact school's matching fee items are returned ──
    let filteredDetails = deduped;

    // 1. Filter by course (SSLC / HSC) — stored as fee.course in each detail
    //    If the fee detail has no course field (older data), keep it to avoid
    //    hiding everything. Only exclude when there IS a value and it doesn't match.
    if (courseParam) {
      filteredDetails = filteredDetails.filter((fee) => {
        if (!fee.course) return true; // no course tag → include (backward-compat)
        return fee.course.toUpperCase() === courseParam;
      });
    }

    // 2. Filter by medium — only show fee items created for this medium
    //    Empty/null medium on a fee item means it applies to ALL mediums.
    if (mediumParam) {
      filteredDetails = filteredDetails.filter((fee) => {
        if (!fee.medium) return true; // no medium tag → applies to all
        return fee.medium.toLowerCase() === mediumParam.toLowerCase();
      });
    }

    // 3. Filter by student_type (new / old)
    //    Empty/null studentType on a fee item means it applies to ALL types.
    if (studentTypeParam) {
      filteredDetails = filteredDetails.filter((fee) => {
        if (!fee.studentType) return true; // no studentType tag → applies to all
        return fee.studentType.toLowerCase() === studentTypeParam;
      });
    }

    // 4. Grade-based filtering
    //    Filter by matching grade label when provided.
    //    A fee item with no grade field is treated as applying to ALL grades.
    //    No PTA-only restriction — all fee types defined for that grade are returned.
    if (gradeParam) {
      filteredDetails = filteredDetails.filter((fee) =>
        !fee.grade || fee.grade.trim().toLowerCase() === gradeParam.toLowerCase()
      );
      console.log(`getBySchoolAndYear: grade="${gradeParam}" → ${filteredDetails.length} entries after grade filter`);
    }

    const filteredTypes = [...new Set(filteredDetails.map((f) => f.type).filter(Boolean))].sort();

    console.log(
      `getBySchoolAndYear: feeTypes=${filteredTypes.join(", ")}, ` +
      `returning ${filteredDetails.length} entries`
    );

    res.status(200).json({
      message:    "Fetched",
      feeTypes:   filteredTypes,
      feeDetails: filteredDetails,
      data:       demands,
    });
  } catch (error) {
    console.error("getBySchoolAndYear error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = controller;