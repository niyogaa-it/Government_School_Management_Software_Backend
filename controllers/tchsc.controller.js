// controllers/tchsc.controller.js
const { Tchsc, Studenthsc, School, Grade, Section } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

const controller = {};

/* ─────────────────────────────────────────────────────────────────────────
   BULK ISSUE TC  (HSC)
   Body: { studentIds: [1,2,3], tcDate, reason, conductCertificate, remarks }
   TC Number format: <shortcode>/TC-HSC/<withdrawnNumber padded 4>
   e.g.  RMHSS/TC-HSC/0001
   ───────────────────────────────────────────────────────────────────────── */
controller.bulkIssueTc = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { studentIds, tcDate, reason, conductCertificate, remarks } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "studentIds array is required" });
    }

    const students = await Studenthsc.findAll({
      where: {
        id: { [Op.in]: studentIds },
        status: { [Op.ne]: "Removed" },
      },
      include: [
        { model: School,   attributes: ["id", "name", "shortcode"] },
        { model: Grade,    attributes: ["id", "grade"] },
        { model: Section,  as: "Section", attributes: ["id", "sectionName"] },
      ],
      transaction: t,
    });

    if (students.length === 0) {
      await t.rollback();
      return res.status(404).json({ error: "No valid students found" });
    }

    // Block if any student already has an active TC
    const existingTc = await Tchsc.findAll({
      where: {
        studenthsc_id: { [Op.in]: studentIds },
        status: "Issued",
      },
      transaction: t,
    });
    if (existingTc.length > 0) {
      const names = existingTc.map(tc => tc.studentName).join(", ");
      await t.rollback();
      return res.status(400).json({ error: `TC already issued for: ${names}` });
    }

    const issuedTcs = [];

    for (const student of students) {
      const schoolId = student.school_id;
      const school   = student.School;

      const lastTc = await Tchsc.findOne({
        where: { school_id: schoolId },
        order: [["withdrawnNumber", "DESC"]],
        attributes: ["withdrawnNumber"],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const nextWithdrawnNumber = lastTc ? lastTc.withdrawnNumber + 1 : 1;
      const tcNumber = `${school.shortcode}/TC-HSC/${String(nextWithdrawnNumber).padStart(4, "0")}`;

      const newTc = await Tchsc.create(
        {
          tcNumber,
          withdrawnNumber:    nextWithdrawnNumber,
          school_id:          schoolId,
          studenthsc_id:      student.id,
          admissionNumber:    student.admissionNumber,
          studentName:        student.name,
          academicYear:       student.academicYear,
          grade:              student.Grade?.grade        || null,
          section:            student.Section?.sectionName || null,
          group:              student.group_id            || null,
          tcDate:             tcDate || new Date(),
          reason:             reason || null,
          conductCertificate: conductCertificate || "Good",
          remarks:            remarks || null,
          status:             "Issued",
        },
        { transaction: t }
      );

      await student.update({ status: "TC Issued" }, { transaction: t });

      issuedTcs.push(newTc);
    }

    await t.commit();
    return res.status(201).json({
      message: `TC issued for ${issuedTcs.length} student(s) successfully`,
      tcs: issuedTcs,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error issuing HSC TC:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET ALL TCs — superadmin (all schools, no year filter)
   ───────────────────────────────────────────────────────────────────────── */
controller.getAllTcs = async (req, res) => {
  try {
    const tcs = await Tchsc.findAll({
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School,     attributes: ["id", "name"] },
        { model: Studenthsc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET TCs BY SCHOOL — all years for a specific school
   FIX: was returning 404 because route existed but controller was correct;
        confirmed working — no change needed except ensuring route is registered
   ───────────────────────────────────────────────────────────────────────── */
controller.getTcsBySchool = async (req, res) => {
  try {
    const { school_id } = req.params;
    if (!school_id) return res.status(400).json({ error: "school_id is required" });

    const tcs = await Tchsc.findAll({
      where: { school_id },
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School,     attributes: ["id", "name"] },
        { model: Studenthsc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET TCs BY SCHOOL + YEAR  (NEW — was missing, caused "Failed to fetch" error)
   Route: GET /tchsc/getTcsBySchoolAndYear/:school_id/:year
   ───────────────────────────────────────────────────────────────────────── */
controller.getTcsBySchoolAndYear = async (req, res) => {
  try {
    const { school_id, year } = req.params;
    if (!school_id) return res.status(400).json({ error: "school_id is required" });
    if (!year)      return res.status(400).json({ error: "year is required" });

    const tcs = await Tchsc.findAll({
      where: { school_id, academicYear: year },
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School,     attributes: ["id", "name"] },
        { model: Studenthsc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error("Error fetching HSC TCs by school and year:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET TC BY ID
   ───────────────────────────────────────────────────────────────────────── */
controller.getTcById = async (req, res) => {
  try {
    const { id } = req.params;
    const tc = await Tchsc.findByPk(id, {
      include: [
        { model: School,     attributes: ["id", "name"] },
        { model: Studenthsc },
      ],
    });
    if (!tc) return res.status(404).json({ error: "TC not found" });
    return res.status(200).json({ tc });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   CANCEL TC — restores student to active
   ───────────────────────────────────────────────────────────────────────── */
controller.cancelTc = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const tc = await Tchsc.findByPk(id, { transaction: t });

    if (!tc) {
      await t.rollback();
      return res.status(404).json({ error: "TC not found" });
    }
    if (tc.status === "Cancelled") {
      await t.rollback();
      return res.status(400).json({ error: "TC already cancelled" });
    }

    await tc.update({ status: "Cancelled" }, { transaction: t });

    await Studenthsc.update(
      { status: "active" },
      { where: { id: tc.studenthsc_id }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "TC cancelled and student restored to active" });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;