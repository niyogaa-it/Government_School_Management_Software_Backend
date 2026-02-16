const db = require("../models");
const { Subject, School, Grade, Section } = db;

const controller = {};

// Create Subject
controller.createSubject = async (req, res) => {
  try {
    const { subjectName, shortCode, school_id, grade_id, section_id } = req.body;

    if (!subjectName || !shortCode || !school_id || !grade_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newSubject = await Subject.create({
      subjectName,
      shortCode,
      school_id,
      grade_id,
      section_id,
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
        { model: Section, attributes: ["id", "sectionName"] },
      ],
    });

    return res.status(200).json({ subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get Subjects by School, Grade, and Section
// controllers/subject.controller.js

// Get Subjects by School, Grade, and Section
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
  
module.exports = controller;
