const { Grade, School } = require("../models");

const controller = {};

controller.createGrade = async (req, res) => {
    try {
        const { grade, school_id } = req.body;

        // Check if the school exists
        const schoolExists = await School.findByPk(school_id);
        if (!schoolExists) {
            return res.status(404).json({ error: "School not found" });
        }

        // Check for duplicate grade within the same school
        const existingGrade = await Grade.findOne({
            where: { grade, school_id, status: 1 },
        });

        if (existingGrade) {
            return res.status(400).json({ error: "Grade already exists for this school" });
        }

        // If no duplicate, create new grade
        const newGrade = await Grade.create({
            grade,
            school_id,
            status: 1,
        });

        return res.status(201).json({ message: "Grade created successfully", grade: newGrade });
    } catch (error) {
        console.error("Error creating grade:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllGrades = async (req, res) => {
    try {
        const grades = await Grade.findAll({
            where: { status: 1 },
            include: {
                model: School,
                attributes: ["id", "name"],
            },
        });
        return res.json({ grades });
    } catch (error) {
        console.error("Error fetching grades:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getGradesBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) {
            return res.status(400).json({ message: "School ID is required." });
        }

        const grades = await Grade.findAll({
            where: { school_id, status: 1 },
            attributes: ["id", "grade"],
        });

        if (grades.length === 0) {
            return res.status(404).json({ message: "No grades found for this school." });
        }

        res.status(200).json({ grades });
    } catch (error) {
        console.error("Error fetching grades:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if grade exists
    const grade = await Grade.findByPk(id);
    if (!grade) {
      return res.status(404).json({ error: "Grade not found" });
    }

    // Soft delete — set status = 0
    await grade.update({ status: 0 });

    return res.status(200).json({ message: "Grade deleted successfully" });
  } catch (error) {
    console.error("Error deleting grade:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;