/**
 * studentfeedemand.controller.js
 *
 * Handles all operations on the student_fee_demands table:
 *   • Raise demand   – individual student OR bulk (grade / section / medium / studentType)
 *   • List demands   – filter by school, year, grade, section, status
 *   • Record payment – update paid_amount + status, create a FeeCollection receipt
 *   • Delete demand  – remove the demand row (before or after payment)
 *
 * FIX: raiseForStudent and raiseBulk now only block when the incoming fee_items
 *      overlap with an existing unpaid demand's fee types.  A student can have
 *      multiple demands in the same year as long as each covers different fee types
 *      (e.g. Term-1 Tuition + Exam Fee are separate raises and both are allowed).
 */

const StudentFeeDemand = require("../models/studentfeedemand");
const { FeeCollection, School, Studentsslc, Studenthsc, Grade, Section } = require("../models");
const { Op } = require("sequelize");

const controller = {};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER – generate a receipt_no for FeeCollection
───────────────────────────────────────────────────────────────────────────── */
async function generateReceiptNo(school, academicYear) {
  const prefix = `${school.shortcode}/FC/${academicYear}/`;
  const last = await FeeCollection.findOne({
    where: { school_id: school.id, academic_year: academicYear },
    order: [["id", "DESC"]],
    attributes: ["receipt_no"],
  });
  let nextSeq = 1;
  if (last?.receipt_no) {
    const parts = last.receipt_no.split("/");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) nextSeq = num + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER – check if incoming fee_items overlap with any existing unpaid demand
   Returns: { blocked: true, overlap: [...types], existingDemand } | { blocked: false }
───────────────────────────────────────────────────────────────────────────── */
async function checkDuplicateFeeTypes(school_id, academic_year, admission_number, fee_items) {
  // Fetch ALL demands for this student + year (any status — Unpaid, Partial, Paid)
  // We block re-raising a fee type that has already been raised regardless of payment status.
  // A paid fee type is settled; an unpaid/partial one is still pending — neither should be re-raised.
  const existingDemands = await StudentFeeDemand.findAll({
    where: {
      school_id,
      academic_year,
      admission_number: admission_number.trim(),
    },
  });

  if (!existingDemands.length) return { blocked: false, raisedTypes: new Set() };

  // Collect all fee types already raised (across ALL demands, any status)
  const raisedTypes = new Set();
  existingDemands.forEach((d) => {
    let items = d.fee_items || [];
    if (typeof items === "string") {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    if (!Array.isArray(items)) items = [];
    items.forEach((f) => {
      if (f.type) raisedTypes.add(f.type.trim().toLowerCase());
    });
  });

  // Find overlap with the incoming fee_items
  const overlap = fee_items
    .map((f) => f.type)
    .filter((t) => t && raisedTypes.has(t.trim().toLowerCase()));

  if (overlap.length > 0) {
    return { blocked: true, overlap, existingDemand: existingDemands[0], raisedTypes };
  }

  return { blocked: false, raisedTypes };
}

/* ─────────────────────────────────────────────────────────────────────────────
   RAISE DEMAND (individual student)
   POST /studentFeeDemand/raiseForStudent
   Body: { school_id, academic_year, admission_number, emis_number, student_name,
           grade, section, course, medium, student_type, fee_items, demand_id }
───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER – get all fee types already raised for a student in a given year
   Returns a Set of lowercase fee type strings
───────────────────────────────────────────────────────────────────────────── */
async function getRaisedFeeTypes(school_id, academic_year, admission_number) {
  const demands = await StudentFeeDemand.findAll({
    where: { school_id, academic_year, admission_number: admission_number.trim() },
    attributes: ["fee_items"],
  });
  const raised = new Set();
  demands.forEach((d) => {
    let items = d.fee_items || [];
    if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }
    if (!Array.isArray(items)) items = [];
    items.forEach((f) => { if (f.type) raised.add(f.type.trim().toLowerCase()); });
  });
  return raised;
}

controller.raiseForStudent = async (req, res) => {
  try {
    const {
      school_id, academic_year, admission_number, emis_number,
      student_name, grade, section, course, medium, student_type,
      fee_items, demand_id,
    } = req.body;

    if (!school_id || !academic_year || !admission_number || !student_name || !fee_items?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ── Duplicate check: only block if incoming fee TYPES overlap with existing unpaid demands ──
    const dupCheck = await checkDuplicateFeeTypes(
      parseInt(school_id, 10),
      academic_year,
      admission_number,
      fee_items
    );

    if (dupCheck.blocked) {
      return res.status(409).json({
        message: `An unpaid demand already exists for these fee types: ${dupCheck.overlap.join(", ")}. Please collect the existing demand first or choose different fee items.`,
        overlapping_types: dupCheck.overlap,
        data: dupCheck.existingDemand,
      });
    }

    const total_amount = fee_items.reduce((s, f) => s + parseFloat(f.amount || 0), 0);

    const demand = await StudentFeeDemand.create({
      school_id: parseInt(school_id, 10),
      academic_year,
      demand_id: demand_id || null,
      admission_number: admission_number.trim(),
      emis_number: emis_number || null,
      student_name,
      grade: grade || null,
      section: section || null,
      course: course || null,
      medium: medium || null,
      student_type: student_type || null,
      fee_items,
      total_amount,
      paid_amount: 0,
      balance_amount: total_amount,
      status: "Unpaid",
    });

    return res.status(201).json({ message: "Demand raised successfully", data: demand });
  } catch (error) {
    console.error("raiseForStudent error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   RAISE DEMAND (bulk – whole grade / section / medium / student_type)
   POST /studentFeeDemand/raiseBulk
   Body: { school_id, academic_year, course, grade, section, medium, student_type,
           fee_items, demand_id }
   Looks up matching students from Studentsslc / Studenthsc, creates one row each.
───────────────────────────────────────────────────────────────────────────── */
controller.raiseBulk = async (req, res) => {
  try {
    const {
      school_id, academic_year, course = "SSLC",
      grade, section, medium, student_type,
      fee_items, demand_id,
    } = req.body;

    if (!school_id || !academic_year || !fee_items?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const isHSC  = course.toUpperCase() === "HSC";
    const Model  = isHSC ? Studenthsc : Studentsslc;

    const where = {
      school_id: parseInt(school_id, 10),
      academicYear: academic_year,
      status: "active",
    };
    // HSC stores medium in "preferredmedium"; SSLC stores it in "medium"
    if (medium)       where[isHSC ? "preferredmedium" : "medium"] = medium;
    if (student_type) where.studentType = student_type;

    let students = await Model.findAll({
      where,
      include: [
        { model: Grade,   attributes: ["id", "grade"] },
        { model: Section, as: "Section", attributes: ["id", "sectionName"] },
      ],
    });

    // Post-query filter by grade and section label
    if (grade)   students = students.filter((s) => s?.Grade?.grade === grade);
    if (section) students = students.filter((s) => s?.Section?.sectionName === section);

    if (!students.length) {
      return res.status(404).json({ message: "No active students found for the given filters." });
    }

    const total_amount = fee_items.reduce((s, f) => s + parseFloat(f.amount || 0), 0);

    let created = 0, skipped = 0, failed = 0;
    const results = [];
    const skippedStudents = [];

    for (const student of students) {
      try {
        // ── Duplicate check: skip only if fee TYPES overlap with existing unpaid demand ──
        const dupCheck = await checkDuplicateFeeTypes(
          parseInt(school_id, 10),
          academic_year,
          student.admissionNumber,
          fee_items
        );

        if (dupCheck.blocked) {
          skipped++;
          skippedStudents.push({
            admission_number: student.admissionNumber,
            name: student.name,
            overlapping_types: dupCheck.overlap,
          });
          continue;
        }

        const row = await StudentFeeDemand.create({
          school_id: parseInt(school_id, 10),
          academic_year,
          demand_id: demand_id || null,
          admission_number: student.admissionNumber,
          emis_number: String(student.emisNum || ""),
          student_name: student.name,
          grade: student.Grade?.grade || grade || null,
          section: student.Section?.sectionName || section || null,
          course: course.toUpperCase(),
          medium: student.medium || student.preferredmedium || medium || null,
          student_type: student.studentType || student_type || null,
          fee_items,
          total_amount,
          paid_amount: 0,
          balance_amount: total_amount,
          status: "Unpaid",
        });

        created++;
        results.push(row);
      } catch (innerErr) {
        console.error(`raiseBulk: failed for student ${student.admissionNumber}:`, innerErr.message);
        failed++;
      }
    }

    return res.status(201).json({
      message: `Demand raised for ${created} student(s). ${skipped} skipped (overlapping fee types). ${failed} failed.`,
      created,
      skipped,
      failed,
      skipped_students: skippedStudents,
      data: results,
    });
  } catch (error) {
    console.error("raiseBulk error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET DEMANDS (list page)
   GET /studentFeeDemand/list?school_id=&academic_year=&grade=&section=&status=&course=
───────────────────────────────────────────────────────────────────────────── */
controller.getDemands = async (req, res) => {
  try {
    const { school_id, academic_year, grade, section, status, course, admission_number } = req.query;

    if (!school_id || !academic_year) {
      return res.status(400).json({ message: "school_id and academic_year are required" });
    }

    const where = {
      school_id: parseInt(school_id, 10),
      academic_year,
    };
    if (grade)            where.grade            = grade;
    if (section)          where.section          = section;
    if (status)           where.status           = status;
    if (course)           where.course           = course;
    if (admission_number) where.admission_number = admission_number.trim();

    const demands = await StudentFeeDemand.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ message: "Fetched", count: demands.length, data: demands });
  } catch (error) {
    console.error("getDemands error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   RECORD PAYMENT  (Mark as Paid / Partial)
   POST /studentFeeDemand/recordPayment/:id
   Body: { paid_amount, payment_mode, transaction_id, collection_date, remarks, collected_by }
   Creates a FeeCollection receipt and updates the demand row.
───────────────────────────────────────────────────────────────────────────── */
controller.recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paid_amount,
      payment_mode = "Cash",
      transaction_id,
      collection_date,
      remarks,
      collected_by,
    } = req.body;

    if (!paid_amount || !collection_date) {
      return res.status(400).json({ message: "paid_amount and collection_date are required" });
    }

    const demand = await StudentFeeDemand.findByPk(id);
    if (!demand) return res.status(404).json({ message: "Demand not found" });
    if (demand.status === "Paid") {
      return res.status(400).json({ message: "This demand is already fully paid." });
    }

    const numPaid     = parseFloat(paid_amount);
    const alreadyPaid = parseFloat(demand.paid_amount || 0);
    const total       = parseFloat(demand.total_amount);
    const outstanding = total - alreadyPaid;

    if (numPaid <= 0 || numPaid > outstanding + 0.01) {
      return res.status(400).json({
        message: `Invalid amount. Outstanding balance is ₹${outstanding.toFixed(2)}.`,
      });
    }

    const school = await School.findByPk(demand.school_id, {
      attributes: ["id", "name", "address", "logo", "shortcode"],
    });
    if (!school) return res.status(404).json({ message: "School not found" });

    const receipt_no = await generateReceiptNo(school, demand.academic_year);

    const newPaid    = alreadyPaid + numPaid;
    const newBalance = total - newPaid;
    const newStatus  = newBalance <= 0.01 ? "Paid" : "Partial";

    const collection = await FeeCollection.create({
      receipt_no,
      school_id:        demand.school_id,
      academic_year:    demand.academic_year,
      student_id:       null,
      admission_number: demand.admission_number,
      emis_number:      demand.emis_number || null,
      student_name:     demand.student_name,
      grade:            demand.grade || null,
      section:          demand.section || null,
      course:           demand.course || null,
      fee_items:        demand.fee_items,
      medium:           demand.medium || null,
      student_type:     demand.student_type || null,
      total_amount:     total,
      paid_amount:      numPaid,
      balance_amount:   newBalance,
      payment_mode,
      transaction_id:   transaction_id || null,
      collection_date,
      collected_by:     collected_by || null,
      remarks:          remarks || null,
    });

    await demand.update({
      paid_amount:    newPaid,
      balance_amount: newBalance,
      status:         newStatus,
    });

    return res.status(200).json({
      message: `Payment recorded. Status: ${newStatus}`,
      receipt_no,
      data: {
        demand:     demand.toJSON(),
        collection: { ...collection.toJSON(), school: school.toJSON() },
      },
    });
  } catch (error) {
    console.error("recordPayment error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE DEMAND
   DELETE /studentFeeDemand/delete/:id
   Can delete any demand (admin action). Also deletes linked receipts if requested.
───────────────────────────────────────────────────────────────────────────── */
controller.deleteDemand = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteReceipts = false } = req.query;

    const demand = await StudentFeeDemand.findByPk(id);
    if (!demand) return res.status(404).json({ message: "Demand not found" });

    if (deleteReceipts === "true" || deleteReceipts === true) {
      await FeeCollection.destroy({
        where: {
          school_id:        demand.school_id,
          academic_year:    demand.academic_year,
          admission_number: demand.admission_number,
        },
      });
    }

    await demand.destroy();
    return res.status(200).json({ message: "Demand deleted successfully" });
  } catch (error) {
    console.error("deleteDemand error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET SINGLE DEMAND
   GET /studentFeeDemand/:id
───────────────────────────────────────────────────────────────────────────── */
controller.getById = async (req, res) => {
  try {
    const demand = await StudentFeeDemand.findByPk(req.params.id);
    if (!demand) return res.status(404).json({ message: "Not found" });
    return res.status(200).json({ data: demand });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};


/* ─────────────────────────────────────────────────────────────────────────────
   GET RAISED FEE TYPES FOR STUDENT
   GET /studentFeeDemand/raisedTypes?school_id=&academic_year=&admission_number=
   Returns the list of fee types already raised for a student so the frontend
   can grey-out / disable those fee items when raising new demands.
───────────────────────────────────────────────────────────────────────────── */
controller.getRaisedFeeTypesForStudent = async (req, res) => {
  try {
    const { school_id, academic_year, admission_number } = req.query;
    if (!school_id || !academic_year || !admission_number) {
      return res.status(400).json({ message: "school_id, academic_year and admission_number are required" });
    }
    const raised = await getRaisedFeeTypes(
      parseInt(school_id, 10),
      academic_year,
      admission_number
    );
    return res.status(200).json({ raised_types: [...raised] });
  } catch (error) {
    console.error("getRaisedFeeTypesForStudent error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET DEMAND SUMMARY BY STUDENT
   GET /studentFeeDemand/summary?school_id=&academic_year=&admission_number=
   Returns total raised, total paid, balance and list of raised fee types.
───────────────────────────────────────────────────────────────────────────── */
controller.getStudentDemandSummary = async (req, res) => {
  try {
    const { school_id, academic_year, admission_number } = req.query;
    if (!school_id || !academic_year || !admission_number) {
      return res.status(400).json({ message: "Missing required query params" });
    }
    const demands = await StudentFeeDemand.findAll({
      where: {
        school_id: parseInt(school_id, 10),
        academic_year,
        admission_number: admission_number.trim(),
      },
    });

    const raisedTypes = new Set();
    let totalRaised = 0, totalPaid = 0;

    demands.forEach((d) => {
      let items = d.fee_items || [];
      if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }
      if (!Array.isArray(items)) items = [];
      items.forEach((f) => { if (f.type) raisedTypes.add(f.type.trim().toLowerCase()); });
      totalRaised += parseFloat(d.total_amount || 0);
      totalPaid   += parseFloat(d.paid_amount  || 0);
    });

    return res.status(200).json({
      admission_number,
      raised_types:  [...raisedTypes],
      total_raised:  totalRaised,
      total_paid:    totalPaid,
      total_balance: totalRaised - totalPaid,
      demands,
    });
  } catch (error) {
    console.error("getStudentDemandSummary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = controller;
