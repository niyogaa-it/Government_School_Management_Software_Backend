const { Studentsslc, Grade, Section } = require("../models");
const { Op } = require("sequelize");

const controller = {};

/**
 * GET STUDENTS FOR PROMOTION
 */
controller.getStudentsForPromotion = async (req, res) => {
  try {
    const { school_id, academicYear, grade_id, section_id } = req.query;

    if (!school_id || !academicYear || !grade_id || !section_id) {
      return res.status(400).json({
        message: "school_id, academicYear, grade_id, section_id are required"
      });
    }

    const students = await Studentsslc.findAll({
      where: {
        school_id,
        academicYear,
        grade_id,
        section_id,
        status: { [Op.ne]: "Removed" }
      },
      attributes: [
        "id",
        "name",
        "admissionNumber",
        "fatherName"
      ],
      include: [
        { model: Grade, attributes: ["id", "grade"] },
        { model: Section, as: "Section", attributes: ["id", "sectionName"] }
      ],
      order: [["name", "ASC"]]
    });

    return res.status(200).json({ students });

  } catch (error) {
    console.error("Fetch promotion students error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PROMOTE MULTIPLE STUDENTS
 */
controller.promoteStudents = async (req, res) => {
  try {
    const {
      studentIds,
      toAcademicYear,
      toGradeId,
      toSectionId
    } = req.body;

    if (
      !studentIds?.length ||
      !toAcademicYear ||
      !toGradeId ||
      !toSectionId
    ) {
      return res.status(400).json({ message: "Missing required data" });
    }

    await Studentsslc.update(
      {
        academicYear: toAcademicYear,
        grade_id: toGradeId,
        section_id: toSectionId
      },
      {
        where: { id: studentIds }
      }
    );

    return res.json({ message: "Students promoted successfully" });

  } catch (error) {
    console.error("Promote error:", error);
    res.status(500).json({ message: "Promotion failed" });
  }
};

module.exports = controller;
