const db = require("../models");
const { Subject, School, Grade } = db;

const controller = {};

// Create Subject
controller.createSubject = async (req, res) => {
  try {
    const { subjectName, shortCode, school_id, grade_id } = req.body;

    if (!subjectName || !shortCode || !school_id || !grade_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Check School Exists
    const schoolExists = await School.findByPk(school_id);
    if (!schoolExists) {
      return res.status(404).json({ error: "School not found" });
    }

    // ✅ Check Grade Exists
    const gradeExists = await Grade.findByPk(grade_id);
    if (!gradeExists) {
      return res.status(404).json({ error: "Grade not found" });
    }

    // 🔎 ✅ DUPLICATE CHECK
    const existingSubject = await Subject.findOne({
      where: {
        subjectName: subjectName.trim(),
        school_id,
        grade_id,
        status: 1,
      },
    });

    if (existingSubject) {
      return res.status(400).json({
        error: "Subject already exists for this school and grade",
      });
    }

    // ✅ Create Subject
    const newSubject = await Subject.create({
      subjectName: subjectName.trim(),
      shortCode,
      school_id,
      grade_id,
      status: 1,
    });

    return res.status(201).json({
      message: "Subject created successfully",
      subject: newSubject,
    });

  } catch (error) {
    console.error("Error creating subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get All Subjects
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
    res.status(500).json({ error: "Internal server error" });
  }
};

controller.getSubjectsBySchoolGradeSection = async (req, res) => {
    try {
      const { schoolId, gradeId, sectionId } = req.params;
  
      const subjects = await Subject.findAll({
        where: {
          school_id: schoolId,
          grade_id: gradeId,
          section_id: sectionId,
          status: 1,
        },
      });
  
      return res.status(200).json({ subjects });
    } catch (error) {
      console.error("Error fetching subjects by school, grade, section:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

// Soft Delete Subject
controller.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await Subject.update(
      { status },
      { where: { id } }
    );

    return res.status(200).json({
      message: "Subject status updated successfully",
    });
  } catch (error) {
    console.error("Error updating subject status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update Subject
controller.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectName, shortCode, school_id, grade_id } = req.body;

    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    // Duplicate check (excluding current record)
    const existingSubject = await Subject.findOne({
      where: {
        subjectName: subjectName.trim(),
        school_id,
        grade_id,
        status: 1,
        id: { [require("sequelize").Op.ne]: id },
      },
    });

    if (existingSubject) {
      return res.status(400).json({
        error: "Subject already exists for this school and grade",
      });
    }

    await subject.update({
      subjectName: subjectName.trim(),
      shortCode,
      school_id,
      grade_id,
    });

    return res.status(200).json({
      message: "Subject updated successfully",
      subject,
    });

  } catch (error) {
    console.error("Error updating subject:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

controller.getSubjectsBySchoolAndGrade = async (req, res) => {
  try {
    const { schoolId, gradeId } = req.params;

    const subjects = await Subject.findAll({
      where: {
        school_id: schoolId,
        grade_id: gradeId,
        status: 1,
      },
      attributes: ["id", "subjectName"],
    });

    return res.status(200).json({ subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
  
module.exports = controller;
