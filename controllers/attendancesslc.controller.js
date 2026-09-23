// controllers/attendance.controller.js
const { Op } = require("sequelize");
const sequelize  = require("../config/database");
const Attendance = require("../models/attendancesslc");
const { Studentsslc, School, Grade, Section } = require("../models");

const controller = {};

// ─────────────────────────────────────────────────────────────────────────────
// GET STUDENTS FOR ATTENDANCE
// Fetches active SSLC students filtered by school, academicYear, grade, section.
// Route: GET /attendance/getStudentsForAttendance
// Query: school_id, academicYear, grade_id, section_id
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsForAttendance = async (req, res) => {
  try {
    const { school_id, academicYear, grade_id, section_id } = req.query;

    if (!school_id || !academicYear || !grade_id || !section_id) {
      return res.status(400).json({ error: "school_id, academicYear, grade_id and section_id are required" });
    }

    const students = await Studentsslc.findAll({
      where: {
        school_id,
        academicYear,
        grade_id,
        section_id,
        status: { [Op.notIn]: ["Removed", "Withdrawn", "TC Issued"] },
      },
      include: [
        { model: Grade,   attributes: ["id", "grade"] },
        { model: Section, as: "Section", attributes: ["id", "sectionName"] },
      ],
      order: [["name", "ASC"]],
      attributes: ["id", "admissionNumber", "name", "gender", "grade_id", "section_id"],
    });

    return res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students for attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ATTENDANCE RECORD
// Returns the absent list for a given school/grade/section/date/session.
// Front-end infers Present for students NOT in this list.
// Route: GET /attendance/getAttendance
// Query: school_id, academicYear, grade_id, section_id, date, session
// ─────────────────────────────────────────────────────────────────────────────
controller.getAttendance = async (req, res) => {
  try {
    const { school_id, academicYear, grade_id, section_id, date, session } = req.query;

    if (!school_id || !academicYear || !grade_id || !section_id || !date || !session) {
      return res.status(400).json({ error: "school_id, academicYear, grade_id, section_id, date and session are required" });
    }

    const records = await Attendance.findAll({
      where: { school_id, academicYear, grade_id, section_id, date, session },
      attributes: ["id", "admissionNumber", "studentName", "date", "session", "status"],
    });

    return res.status(200).json({ attendance: records });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT ATTENDANCE
// Stores ONLY absent records. All previous records for this session/date
// are deleted first, then the new absent list is inserted.
// Route: POST /attendance/submitAttendance
// Body: { school_id, academicYear, grade_id, section_id, date, session, absentStudents: [{admissionNumber, studentName}] }
// ─────────────────────────────────────────────────────────────────────────────
controller.submitAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { school_id, academicYear, grade_id, section_id, date, session, absentStudents } = req.body;

    if (!school_id || !academicYear || !grade_id || !section_id || !date || !session) {
      await transaction.rollback();
      return res.status(400).json({ error: "school_id, academicYear, grade_id, section_id, date and session are required" });
    }

    if (!Array.isArray(absentStudents)) {
      await transaction.rollback();
      return res.status(400).json({ error: "absentStudents must be an array" });
    }

    // Delete existing records for this slot (idempotent re-submit)
    await Attendance.destroy({
      where: { school_id, academicYear, grade_id, section_id, date, session },
      transaction,
    });

    // Insert absent records only
    if (absentStudents.length > 0) {
      const rows = absentStudents.map((s) => ({
        school_id,
        academicYear,
        grade_id,
        section_id,
        date,
        session,
        admissionNumber: s.admissionNumber,
        studentName:     s.studentName,
        status:          "Absent",
      }));
      await Attendance.bulkCreate(rows, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({
      message: `Attendance submitted successfully. ${absentStudents.length} student(s) marked absent.`,
      absentCount: absentStudents.length,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error submitting attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ATTENDANCE SUMMARY  (for reports / history view)
// Route: GET /attendance/getSummary
// Query: school_id, academicYear, grade_id?, section_id?, startDate?, endDate?
// ─────────────────────────────────────────────────────────────────────────────
controller.getAttendanceSummary = async (req, res) => {
  try {
    const { school_id, academicYear, grade_id, section_id, startDate, endDate } = req.query;

    if (!school_id || !academicYear) {
      return res.status(400).json({ error: "school_id and academicYear are required" });
    }

    const where = { school_id, academicYear };
    if (grade_id)   where.grade_id   = grade_id;
    if (section_id) where.section_id = section_id;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    }

    const records = await Attendance.findAll({
      where,
      include: [
        { model: Grade,   attributes: ["id", "grade"] },
        { model: Section, as: "Section", attributes: ["id", "sectionName"] },
      ],
      order: [["date", "DESC"], ["session", "ASC"]],
    });

    return res.status(200).json({ summary: records });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;