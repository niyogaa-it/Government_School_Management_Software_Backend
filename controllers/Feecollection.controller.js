const { FeeCollection, School } = require("../models");
const sequelize = require("../config/database");
const { Op, QueryTypes } = require("sequelize");

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
      return res
        .status(400)
        .json({ message: "school_id and academicYear are required" });
    const school = await School.findByPk(school_id);
    if (!school) return res.status(404).json({ message: "School not found" });
    const receiptNo = await generateReceiptNo(school, academicYear);
    res.status(200).json({ receiptNo });
  } catch (error) {
    console.error("getNextReceipt error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getSchoolById = async (req, res) => {
  try {
    const { school_id } = req.params;
    const school = await School.findByPk(school_id, {
      attributes: ["id", "name", "address", "logo", "shortcode"],
    });
    if (!school) return res.status(404).json({ message: "School not found" });
    res.status(200).json({ data: school });
  } catch (error) {
    console.error("getSchoolById error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.saveFeeCollection = async (req, res) => {
  try {
    const {
      school_id,
      academic_year,
      student_id,
      admission_number,
      emis_number,
      student_name,
      grade,
      section,
      course,
      fee_items,
      medium,
      student_type,
      total_amount,
      paid_amount,
      payment_mode,
      transaction_id,
      collection_date,
      collected_by,
      remarks,
      // Balance carry-forward fields (sent by frontend)
      is_balance_payment = false,
      prior_receipt_nos  = [],
    } = req.body;

    if (
      !school_id ||
      !academic_year ||
      !admission_number ||
      !student_name ||
      !fee_items?.length ||
      !total_amount ||
      !paid_amount ||
      !collection_date
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const school = await School.findByPk(school_id);
    if (!school) return res.status(404).json({ message: "School not found" });

    const receipt_no    = await generateReceiptNo(school, academic_year);
    const balance_amount = parseFloat(total_amount) - parseFloat(paid_amount);

    const collection = await FeeCollection.create({
      receipt_no,
      school_id,
      academic_year,
      student_id:         student_id || null,
      admission_number,
      emis_number:        emis_number || null,
      student_name,
      grade:              grade || null,
      section:            section || null,
      course:             course || null,
      fee_items,
      medium:             medium || null,
      student_type:       student_type || null,
      total_amount:       parseFloat(total_amount),
      paid_amount:        parseFloat(paid_amount),
      balance_amount,
      payment_mode:       payment_mode || "Cash",
      transaction_id:     transaction_id || null,
      collection_date,
      collected_by:       collected_by || null,
      remarks:            remarks || null,
      is_balance_payment: !!is_balance_payment,
      prior_receipt_nos:  Array.isArray(prior_receipt_nos) ? prior_receipt_nos : [],
    });

    const schoolData = await School.findByPk(school_id, {
      raw: true,
      attributes: ["id", "name", "address", "logo", "shortcode"],
    });

    const responseData = {
      ...(collection.toJSON ? collection.toJSON() : collection),
      school: schoolData || null,
    };

    res.status(201).json({
      message: "Fee collection saved successfully",
      receipt_no,
      data: responseData,
    });
  } catch (error) {
    console.error("saveFeeCollection error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ============================================================
   UPDATE FEE COLLECTION RECORD
   PUT /feeCollection/update/:id
============================================================ */
controller.updateFeeCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await FeeCollection.findByPk(id);
    if (!record) {
      return res
        .status(404)
        .json({ message: "Fee collection record not found" });
    }

    const {
      student_name,
      admission_number,
      academic_year,
      course,
      grade,
      section,
      medium,
      paid_amount,
      balance_amount,
      payment_mode,
      transaction_id,
      collection_date,
    } = req.body;

    await record.update({
      student_name: student_name ?? record.student_name,
      admission_number: admission_number ?? record.admission_number,
      academic_year: academic_year ?? record.academic_year,
      course: course ?? record.course,
      grade: grade ?? record.grade,
      section: section ?? record.section,
      medium: medium ?? record.medium,
      paid_amount:
        paid_amount != null ? parseFloat(paid_amount) : record.paid_amount,
      balance_amount:
        balance_amount != null
          ? parseFloat(balance_amount)
          : record.balance_amount,
      payment_mode: payment_mode ?? record.payment_mode,
      transaction_id:
        transaction_id !== undefined
          ? transaction_id || null
          : record.transaction_id,
      collection_date: collection_date ?? record.collection_date,
    });

    console.log(`updateFeeCollection: id=${id} updated successfully`);

    res
      .status(200)
      .json({ message: "Fee collection updated successfully", data: record });
  } catch (error) {
    console.error("updateFeeCollection error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

controller.getDailyCollection = async (req, res) => {
  try {
    const { school_id, date } = req.query;
    if (!school_id || !date)
      return res
        .status(400)
        .json({ message: "school_id and date are required" });

    const collections = await FeeCollection.findAll({
      where: { school_id, collection_date: date },
      order: [["id", "ASC"]],
    });

    const summary = { PTA: 0, Management: 0, total: 0 };
    collections.forEach((c) => {
      let items = c.fee_items || [];
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          items = [];
        }
      }
      items.forEach((item) => {
        if (item.type === "PTA") summary.PTA += parseFloat(item.amount || 0);
        if (item.type === "Management")
          summary.Management += parseFloat(item.amount || 0);
      });
      summary.total += parseFloat(c.paid_amount || 0);
    });

    res
      .status(200)
      .json({
        message: "Daily collection fetched",
        date,
        summary,
        data: collections,
      });
  } catch (error) {
    console.error("getDailyCollection error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getCollectionByRange = async (req, res) => {
  try {
    const { school_id, from, to } = req.query;
    if (!school_id || !from || !to)
      return res
        .status(400)
        .json({ message: "school_id, from and to dates are required" });

    const collections = await FeeCollection.findAll({
      where: { school_id, collection_date: { [Op.between]: [from, to] } },
      order: [
        ["collection_date", "ASC"],
        ["id", "ASC"],
      ],
    });

    const totalCollected = collections.reduce(
      (sum, c) => sum + parseFloat(c.paid_amount || 0),
      0,
    );

    res.status(200).json({
      message: "Collection report fetched",
      from,
      to,
      totalCollected,
      count: collections.length,
      data: collections,
    });
  } catch (error) {
    console.error("getCollectionByRange error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getByReceipt = async (req, res) => {
  try {
    const { receiptNo } = req.params;
    const collection = await FeeCollection.findOne({
      where: { receipt_no: receiptNo },
    });
    if (!collection)
      return res.status(404).json({ message: "Receipt not found" });
    res.status(200).json({ data: collection });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getAllBySchool = async (req, res) => {
  try {
    const { school_id } = req.params;
    const { academicYear } = req.query;

    let yearClause = "";
    const replacements = { school_id };
    if (academicYear) {
      yearClause = "AND fc.academic_year = :academicYear";
      replacements.academicYear = academicYear;
    }

    const data = await sequelize.query(
      `SELECT fc.*,
              s.id        AS school__id,
              s.name      AS school__name,
              s.address   AS school__address,
              s.logo      AS school__logo,
              s.shortcode AS school__shortcode
       FROM fee_collections fc
       INNER JOIN school s ON fc.school_id = s.id
       WHERE fc.school_id = :school_id ${yearClause}
       ORDER BY fc.collection_date DESC, fc.id DESC`,
      { replacements, type: QueryTypes.SELECT },
    );

    // Shape each row so frontend receives record.school object
    const shaped = data.map((row) => {
      const {
        school__id,
        school__name,
        school__address,
        school__logo,
        school__shortcode,
        ...rest
      } = row;
      return {
        ...rest,
        school: {
          id: school__id,
          name: school__name,
          address: school__address,
          logo: school__logo,
          shortcode: school__shortcode,
        },
      };
    });

    console.log(
      `getAllBySchool: school_id=${school_id}, year=${academicYear || "ALL"}, found=${shaped.length}`,
    );
    res.status(200).json({ data: shaped });
  } catch (error) {
    console.error("getAllBySchool error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getAllRecords = async (req, res) => {
  try {
    const { academicYear } = req.query;

    let yearClause = "";
    const replacements = {};
    if (academicYear) {
      yearClause = "WHERE fc.academic_year = :academicYear";
      replacements.academicYear = academicYear;
    }

    const data = await sequelize.query(
      `SELECT fc.*,
              s.id        AS school__id,
              s.name      AS school__name,
              s.address   AS school__address,
              s.logo      AS school__logo,
              s.shortcode AS school__shortcode
       FROM fee_collections fc
       INNER JOIN school s ON fc.school_id = s.id
       ${yearClause}
       ORDER BY fc.collection_date DESC, fc.id DESC`,
      { replacements, type: QueryTypes.SELECT },
    );

    // Shape each row so frontend receives record.school object
    const shaped = data.map((row) => {
      const {
        school__id,
        school__name,
        school__address,
        school__logo,
        school__shortcode,
        ...rest
      } = row;
      return {
        ...rest,
        school: {
          id: school__id,
          name: school__name,
          address: school__address,
          logo: school__logo,
          shortcode: school__shortcode,
        },
      };
    });

    console.log(
      `getAllRecords: year=${academicYear || "ALL"}, found=${shaped.length}`,
    );
    res.status(200).json({ data: shaped });
  } catch (error) {
    console.error("getAllRecords error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

controller.getGradeSummary = async (req, res) => {
  try {
    const { school_id, academicYear, grade } = req.query;
    if (!school_id || !academicYear || !grade) {
      return res
        .status(400)
        .json({ message: "school_id, academicYear and grade are required" });
    }

    const collections = await FeeCollection.findAll({
      where: { school_id, academic_year: academicYear, grade },
      attributes: [
        "id",
        "admission_number",
        "student_name",
        "paid_amount",
        "balance_amount",
        "receipt_no",
        "collection_date",
      ],
      order: [["id", "ASC"]],
    });

    // Group by admission_number — sum paid amounts
    const summaryMap = {};
    collections.forEach((c) => {
      const key = c.admission_number;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          admission_number: c.admission_number,
          student_name: c.student_name,
          total_paid: 0,
          receipts: [],
        };
      }
      summaryMap[key].total_paid += parseFloat(c.paid_amount || 0);
      summaryMap[key].receipts.push({
        id: c.id,
        receipt_no: c.receipt_no,
        paid_amount: c.paid_amount,
        collection_date: c.collection_date,
      });
    });

    res.status(200).json({
      message: "Grade summary fetched",
      data: Object.values(summaryMap),
    });
  } catch (error) {
    console.error("getGradeSummary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================================================
   GET STUDENT FEE BALANCE
   GET /feeCollection/getStudentBalance?school_id=1&academic_year=2026-2027
                                        &admission_number=RLMHSSSSLC/26-27/0004
                                        &fee_types=PTA,Management

   Returns:
   {
     structureTotal  : 1000,   ← sum of matched fee-structure rows
     totalPaid       : 950,    ← sum of all paid_amount in prior receipts
     balance         : 50,     ← amount still owed (0 if fully paid)
     fullyPaid       : false,
     priorReceipts   : [ { receipt_no, paid_amount, collection_date } ]
   }
============================================================ */
controller.getStudentFeeBalance = async (req, res) => {
  try {
    const { school_id, academic_year, admission_number, fee_types } = req.query;

    if (!school_id || !academic_year || !admission_number) {
      return res.status(400).json({
        message: "school_id, academic_year and admission_number are required",
      });
    }

    // Parse fee_types: "PTA,Management" → ["PTA","Management"] (uppercase for comparison)
    const requestedTypes = fee_types
      ? fee_types.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
      : [];

    // Fetch all fee collections for this student + school + year
    // Use String(school_id) cast to avoid type mismatch
    const records = await FeeCollection.findAll({
      where: {
        school_id:        parseInt(school_id, 10),
        academic_year,
        admission_number: admission_number.trim(),
      },
      attributes: [
        "id", "receipt_no", "paid_amount", "balance_amount",
        "total_amount", "fee_items", "collection_date", "is_balance_payment",
      ],
      order: [["id", "ASC"]],
    });

    // Filter records that overlap with the requested fee types (case-insensitive)
    const matchingRecords = records.filter((c) => {
      if (!requestedTypes.length) return true; // no filter → include all

      let items = c.fee_items || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      if (!Array.isArray(items)) items = [];
      const recordTypes = items.map((f) => (f.type || "").toUpperCase());
      return requestedTypes.some((t) => recordTypes.includes(t));
    });

    const totalPaid = matchingRecords.reduce(
      (sum, c) => sum + parseFloat(c.paid_amount || 0),
      0
    );

    const priorReceipts = matchingRecords.map((c) => ({
      id:                 c.id,
      receipt_no:         c.receipt_no,
      paid_amount:        parseFloat(c.paid_amount),
      balance_amount:     parseFloat(c.balance_amount || 0),
      collection_date:    c.collection_date,
      is_balance_payment: c.is_balance_payment,
    }));

    res.status(200).json({
      message:      "Balance fetched",
      totalPaid:    parseFloat(totalPaid.toFixed(2)),
      priorReceipts,
      count:        matchingRecords.length,
    });
  } catch (error) {
    console.error("getStudentFeeBalance error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================================================
   GET FULL FEE HISTORY FOR A STUDENT
   GET /feeCollection/getStudentHistory?school_id=1
                                        &academic_year=2026-2027
                                        &admission_number=RLMHSSSSLC/26-27/0004

   Returns all receipts for the student grouped by fee type,
   with running total paid and remaining balance per type.
============================================================ */
controller.getStudentFeeHistory = async (req, res) => {
  try {
    const { school_id, academic_year, admission_number } = req.query;

    if (!school_id || !academic_year || !admission_number) {
      return res.status(400).json({
        message: "school_id, academic_year and admission_number are required",
      });
    }

    const records = await FeeCollection.findAll({
      where: { school_id, academic_year, admission_number },
      order: [["id", "ASC"]],
    });

    // Group by fee type
    const byType = {};
    records.forEach((c) => {
      let items = c.fee_items || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      const types = [...new Set(items.map((f) => f.type).filter(Boolean))];
      const feeTypeKey = types.join("+") || "UNKNOWN";

      if (!byType[feeTypeKey]) byType[feeTypeKey] = { receipts: [], totalPaid: 0 };

      byType[feeTypeKey].totalPaid += parseFloat(c.paid_amount || 0);
      byType[feeTypeKey].receipts.push({
        id:                 c.id,
        receipt_no:         c.receipt_no,
        paid_amount:        parseFloat(c.paid_amount),
        balance_amount:     parseFloat(c.balance_amount || 0),
        collection_date:    c.collection_date,
        is_balance_payment: c.is_balance_payment,
        prior_receipt_nos:  c.prior_receipt_nos || [],
      });
    });

    res.status(200).json({
      message:        "History fetched",
      admission_number,
      academic_year,
      byType,
      totalRecords:   records.length,
    });
  } catch (error) {
    console.error("getStudentFeeHistory error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = controller;