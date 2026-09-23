// controllers/tc.controller.js
const { Tc, Studentsslc, School, Grade, Section } = require("../models");
const { Op, literal } = require("sequelize");
const sequelize = require("../config/database");

const controller = {};

/* ─────────────────────────────────────────────────────────────
   BULK ISSUE TC
   Body: { studentIds: [1,2,3], tcDate, reason, conductCertificate, remarks }
   Each student gets a unique withdrawnNumber per school (sequential, never resets).
   TC Number format: <shortcode>/TC/<withdrawnNumber padded 4>
   e.g. STMC/TC/0001
   ───────────────────────────────────────────────────────────── */
controller.bulkIssueTc = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { studentIds, tcDate, reason, conductCertificate, remarks } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "studentIds array is required" });
    }

    // Fetch all students
    const students = await Studentsslc.findAll({
      where: { id: { [Op.in]: studentIds }, status: { [Op.ne]: "Removed" } },
      include: [
        { model: School, attributes: ["id", "name", "shortcode"] },
        { model: Grade, attributes: ["id", "grade"] },
        { model: Section, as: "Section", attributes: ["id", "sectionName"] },
      ],
      transaction: t,
    });

    if (students.length === 0) {
      await t.rollback();
      return res.status(404).json({ error: "No valid students found" });
    }

    // Check if any student already has an active TC
    const existingTc = await Tc.findAll({
      where: {
        studentsslc_id: { [Op.in]: studentIds },
        status: "Issued",
      },
      transaction: t,
    });
    if (existingTc.length > 0) {
      const names = existingTc.map((tc) => tc.studentName).join(", ");
      await t.rollback();
      return res.status(400).json({ error: `TC already issued for: ${names}` });
    }

    const issuedTcs = [];

    for (const student of students) {
      const schoolId = student.school_id;
      const school   = student.School;

      // ── Get next withdrawnNumber for THIS school (lock to avoid race) ──
      const lastTc = await Tc.findOne({
        where: { school_id: schoolId },
        order: [["withdrawnNumber", "DESC"]],
        attributes: ["withdrawnNumber"],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const nextWithdrawnNumber = lastTc ? lastTc.withdrawnNumber + 1 : 1;
      const tcNumber = `${school.shortcode}/TC/${String(nextWithdrawnNumber).padStart(4, "0")}`;

      const newTc = await Tc.create(
        {
          tcNumber,
          withdrawnNumber: nextWithdrawnNumber,
          school_id: schoolId,
          studentsslc_id: student.id,
          admissionNumber: student.admissionNumber,
          studentName: student.name,
          academicYear: student.academicYear,
          grade: student.Grade?.grade || null,
          section: student.Section?.sectionName || null,
          tcDate: tcDate || new Date(),
          reason: reason || null,
          conductCertificate: conductCertificate || "Good",
          remarks: remarks || null,
          status: "Issued",
        },
        { transaction: t }
      );

      // Soft-remove the student from Studentsslc (status → "TC Issued")
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
    console.error("Error issuing TC:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL TCs (superadmin — all schools)
   ───────────────────────────────────────────────────────────── */
controller.getAllTcs = async (req, res) => {
  try {
    const tcs = await Tc.findAll({
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Studentsslc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL TCs FOR A SCHOOL
   ───────────────────────────────────────────────────────────── */
controller.getTcsBySchool = async (req, res) => {
  try {
    const { school_id } = req.params;
    const tcs = await Tc.findAll({
      where: { school_id },
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Studentsslc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET TC BY ID
   ───────────────────────────────────────────────────────────── */
controller.getTcById = async (req, res) => {
  try {
    const { id } = req.params;
    const tc = await Tc.findByPk(id, {
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Studentsslc },
      ],
    });
    if (!tc) return res.status(404).json({ error: "TC not found" });
    return res.status(200).json({ tc });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   CANCEL / REVOKE TC
   ───────────────────────────────────────────────────────────── */
controller.cancelTc = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const tc = await Tc.findByPk(id, { transaction: t });
    if (!tc) { await t.rollback(); return res.status(404).json({ error: "TC not found" }); }
    if (tc.status === "Cancelled") { await t.rollback(); return res.status(400).json({ error: "TC already cancelled" }); }

    await tc.update({ status: "Cancelled" }, { transaction: t });

    // Restore student to active
    await Studentsslc.update(
      { status: "active" },
      { where: { id: tc.studentsslc_id }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "TC cancelled and student restored to active" });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL TCs FOR A SCHOOL FILTERED BY YEAR
   ───────────────────────────────────────────────────────────── */
controller.getTcsBySchoolAndYear = async (req, res) => {
  try {
    const { school_id, year } = req.params;
    const tcs = await Tc.findAll({
      where: { school_id, academicYear: year },
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Studentsslc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL TCs FILTERED BY YEAR (superadmin — all schools)
   ───────────────────────────────────────────────────────────── */
controller.getTcsByYear = async (req, res) => {
  try {
    const { year } = req.params;
    const tcs = await Tc.findAll({
      where: { academicYear: year },
      order: [["withdrawnNumber", "ASC"]],
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Studentsslc, attributes: ["id", "admissionNumber", "name"] },
      ],
    });
    return res.status(200).json({ tcs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;