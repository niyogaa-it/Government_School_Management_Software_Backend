const db = require("../models");
const { Subject, School, Grade } = db;
const { Op } = require("sequelize");

const controller = {};

// ─────────────────────────────────────────────
// Create Single Subject
// ─────────────────────────────────────────────
controller.createSubject = async (req, res) => {
  try {
    const { subjectName, academic_year, shortCode, school_id, grade_id } = req.body;

    if (!subjectName || !shortCode || !school_id || !academic_year || !grade_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check School Exists
    const schoolExists = await School.findByPk(school_id);
    if (!schoolExists) return res.status(404).json({ error: "School not found" });

    // Check Grade Exists
    const gradeExists = await Grade.findByPk(grade_id);
    if (!gradeExists) return res.status(404).json({ error: "Grade not found" });

    // Duplicate Check
    const existingSubject = await Subject.findOne({
      where: { subjectName: subjectName.trim(), school_id, academic_year, grade_id, status: 1 },
    });

    if (existingSubject) {
      return res.status(409).json({ error: "Subject already exists for this school and grade" });
    }

    // Create Subject
    const newSubject = await Subject.create({
      subjectName: subjectName.trim(),
      shortCode,
      school_id,
      academic_year,
      grade_id,
      status: 1,
    });

    return res.status(201).json({ message: "Subject created successfully", subject: newSubject });
  } catch (error) {
    console.error("Error creating subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Batch Create Subjects (multiple grades at once)
// POST /subject/createSubjectsBatch
// Body: { school_id, academic_year, subjects: [{grade_id, subjectName, shortCode}] }
// ─────────────────────────────────────────────
controller.createSubjectsBatch = async (req, res) => {
  try {
    const { school_id, academic_year, subjects } = req.body;

    if (!school_id || !academic_year || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Missing required fields: school_id, academic_year, subjects[]" });
    }

    // Validate school
    const schoolExists = await School.findByPk(school_id);
    if (!schoolExists) return res.status(404).json({ error: "School not found" });

    // Process each subject entry individually so we can report per-item results
    const results = await Promise.all(
      subjects.map(async ({ grade_id, subjectName, shortCode }) => {
        if (!grade_id || !subjectName || !shortCode) {
          return { grade_id, status: "error", message: "Missing fields (grade_id, subjectName, shortCode)" };
        }

        try {
          // Check grade exists
          const gradeExists = await Grade.findByPk(grade_id);
          if (!gradeExists) return { grade_id, status: "error", message: "Grade not found" };

          // Duplicate check
          const existing = await Subject.findOne({
            where: { subjectName: subjectName.trim(), school_id, academic_year, grade_id, status: 1 },
          });
          if (existing) return { grade_id, status: "duplicate", message: "Subject already exists for this grade" };

          // Create
          const newSubject = await Subject.create({
            subjectName: subjectName.trim(),
            shortCode: shortCode.trim(),
            school_id,
            academic_year,
            grade_id,
            status: 1,
          });

          return { grade_id, status: "success", subject: newSubject };
        } catch (err) {
          console.error(`Error creating subject for grade ${grade_id}:`, err);
          return { grade_id, status: "error", message: "Internal error for this entry" };
        }
      })
    );

    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.length - successCount;

    return res.status(200).json({
      message: `${successCount} subject(s) created, ${failCount} failed.`,
      results,
    });
  } catch (error) {
    console.error("Error in batch create subjects:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Get All Subjects
// ─────────────────────────────────────────────
controller.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      where: { status: 1 },
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Grade, attributes: ["id", "grade"] },
      ],
    });
    return res.status(200).json({ subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Get Subjects by School, Grade, Section
// ─────────────────────────────────────────────
controller.getSubjectsBySchoolGradeSection = async (req, res) => {
  try {
    const { schoolId, gradeId, sectionId } = req.params;
    const subjects = await Subject.findAll({
      where: { school_id: schoolId, grade_id: gradeId, section_id: sectionId, status: 1 },
    });
    return res.status(200).json({ subjects });
  } catch (error) {
    console.error("Error fetching subjects by school, grade, section:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Soft Delete / Update Status
// ─────────────────────────────────────────────
controller.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await Subject.update({ status }, { where: { id } });
    return res.status(200).json({ message: "Subject status updated successfully" });
  } catch (error) {
    console.error("Error updating subject status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Update Subject
// ─────────────────────────────────────────────
controller.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectName, academic_year, shortCode, school_id, grade_id } = req.body;

    const subject = await Subject.findByPk(id);
    if (!subject) return res.status(404).json({ error: "Subject not found" });

    // Duplicate check (excluding current record)
    const existingSubject = await Subject.findOne({
      where: {
        subjectName: subjectName.trim(),
        school_id,
        academic_year,
        grade_id,
        status: 1,
        id: { [Op.ne]: id },
      },
    });

    if (existingSubject) {
      return res.status(400).json({ error: "Subject already exists for this school and grade" });
    }

    await subject.update({ subjectName: subjectName.trim(), shortCode, school_id, academic_year, grade_id });

    return res.status(200).json({ message: "Subject updated successfully", subject });
  } catch (error) {
    console.error("Error updating subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Get Subjects by School & Grade
// ─────────────────────────────────────────────
controller.getSubjectsBySchoolAndGrade = async (req, res) => {
  try {
    const { schoolId, gradeId } = req.params;
    const subjects = await Subject.findAll({
      where: { school_id: schoolId, grade_id: gradeId, status: 1 },
      attributes: ["id", "subjectName", "academic_year"],
    });
    return res.status(200).json({ subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// Get Subjects by School & Year
// ─────────────────────────────────────────────
controller.getSubjectsBySchoolAndYear = async (req, res) => {
  try {
    const { school_id, academic_year } = req.params;
    if (!school_id || !academic_year)
      return res.status(400).json({ message: "School ID and Academic Year are required." });

    const subjects = await Subject.findAll({
      where: { school_id, academic_year, status: 1 },
      include: [
        { model: School, attributes: ["id", "name"] },
        { model: Grade, attributes: ["id", "grade"] },
      ],
    });

    return res.status(200).json({ subjects });
  } catch (error) {
    console.error("Error fetching subjects by school and year:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;