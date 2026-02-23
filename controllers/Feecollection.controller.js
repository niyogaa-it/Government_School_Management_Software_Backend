const { FeeCollection, School } = require("../models");
const { Op } = require("sequelize");

const controller = {};

const generateReceiptNo = async (school, academicYear) => {
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
};

controller.getNextReceipt = async (req, res) => {
  try {
    const { school_id, academicYear } = req.query;
    if (!school_id || !academicYear)
      return res.status(400).json({ message: "school_id and academicYear are required" });
    const school = await School.findByPk(school_id);
    if (!school) return res.status(404).json({ message: "School not found" });
    const receiptNo = await generateReceiptNo(school, academicYear);
    res.status(200).json({ receiptNo });
  } catch (error) {
    console.error("getNextReceipt error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.saveFeeCollection = async (req, res) => {
  try {
    const {
      school_id, academic_year, student_id, admission_number, student_name,
      grade, section, course, fee_items, medium, student_type,
      total_amount, paid_amount, payment_mode, collection_date, collected_by, remarks,
    } = req.body;

    if (!school_id || !academic_year || !admission_number || !student_name ||
        !fee_items?.length || !total_amount || !paid_amount || !collection_date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const school = await School.findByPk(school_id);
    if (!school) return res.status(404).json({ message: "School not found" });

    const receipt_no = await generateReceiptNo(school, academic_year);
    const balance_amount = parseFloat(total_amount) - parseFloat(paid_amount);

    const collection = await FeeCollection.create({
      receipt_no, school_id, academic_year,
      student_id: student_id || null,
      admission_number, student_name,
      grade: grade || null, section: section || null, course: course || null,
      fee_items, medium: medium || null, student_type: student_type || null,
      total_amount: parseFloat(total_amount),
      paid_amount: parseFloat(paid_amount),
      balance_amount,
      payment_mode: payment_mode || "Cash",
      collection_date,
      collected_by: collected_by || null,
      remarks: remarks || null,
    });

    res.status(201).json({ message: "Fee collection saved successfully", receipt_no, data: collection });
  } catch (error) {
    console.error("saveFeeCollection error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

controller.getDailyCollection = async (req, res) => {
  try {
    const { school_id, date } = req.query;
    if (!school_id || !date)
      return res.status(400).json({ message: "school_id and date are required" });

    const collections = await FeeCollection.findAll({
      where: { school_id, collection_date: date },
      order: [["id", "ASC"]],
    });

    const summary = { PTA: 0, Management: 0, total: 0 };
    collections.forEach((c) => {
      let items = c.fee_items || [];
      if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }
      items.forEach((item) => {
        if (item.type === "PTA") summary.PTA += parseFloat(item.amount || 0);
        if (item.type === "Management") summary.Management += parseFloat(item.amount || 0);
      });
      summary.total += parseFloat(c.paid_amount || 0);
    });

    res.status(200).json({ message: "Daily collection fetched", date, summary, data: collections });
  } catch (error) {
    console.error("getDailyCollection error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getCollectionByRange = async (req, res) => {
  try {
    const { school_id, from, to } = req.query;
    if (!school_id || !from || !to)
      return res.status(400).json({ message: "school_id, from and to dates are required" });

    const collections = await FeeCollection.findAll({
      where: { school_id, collection_date: { [Op.between]: [from, to] } },
      order: [["collection_date", "ASC"], ["id", "ASC"]],
    });

    const totalCollected = collections.reduce(
      (sum, c) => sum + parseFloat(c.paid_amount || 0), 0
    );

    res.status(200).json({
      message: "Collection report fetched", from, to,
      totalCollected, count: collections.length, data: collections,
    });
  } catch (error) {
    console.error("getCollectionByRange error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getByReceipt = async (req, res) => {
  try {
    const { receiptNo } = req.params;
    const collection = await FeeCollection.findOne({ where: { receipt_no: receiptNo } });
    if (!collection) return res.status(404).json({ message: "Receipt not found" });
    res.status(200).json({ data: collection });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================================================
   GET ALL COLLECTIONS FOR A SCHOOL — NO year filter
   GET /feeCollection/getAllBySchool/:school_id
   Optional: ?academicYear=2025-2026  (only if you want to filter)
============================================================ */
controller.getAllBySchool = async (req, res) => {
  try {
    const { school_id } = req.params;
    const { academicYear } = req.query;

    const where = { school_id };
    if (academicYear) where.academic_year = academicYear;

    const collections = await FeeCollection.findAll({
      where,
      order: [["collection_date", "DESC"], ["id", "DESC"]],
    });

    console.log(`getAllBySchool: school_id=${school_id}, year=${academicYear || "ALL"}, found=${collections.length}`);

    res.status(200).json({ data: collections });
  } catch (error) {
    console.error("getAllBySchool error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================================================
   ✅ NEW: GET ALL COLLECTIONS — NO school filter (Admin view)
   GET /feeCollection/getAllRecords
   Optional: ?academicYear=2025-2026
   Use this when the logged-in user is an admin and needs to
   see records across ALL schools.
============================================================ */
controller.getAllRecords = async (req, res) => {
  try {
    const { academicYear } = req.query;

    const where = {};
    if (academicYear) where.academic_year = academicYear;

    const collections = await FeeCollection.findAll({
      where,
      order: [["collection_date", "DESC"], ["id", "DESC"]],
    });

    console.log(`getAllRecords: year=${academicYear || "ALL"}, found=${collections.length}`);

    res.status(200).json({ data: collections });
  } catch (error) {
    console.error("getAllRecords error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = controller;