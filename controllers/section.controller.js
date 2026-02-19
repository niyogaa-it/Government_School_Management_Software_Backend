const { Section, School, Grade } = require("../models");

const controller = {};

controller.createSection = async (req, res) => {
    try {
        const { school_id, grade_id, sectionName, shortCode, status } = req.body;

        const school = await School.findByPk(school_id);
        const grade = await Grade.findByPk(grade_id);

        if (!school || !grade) {
            return res.status(404).json({ error: "School or Grade not found" });
        }

        const duplicateSection = await Section.findOne({
            where: { school_id, grade_id, sectionName }
        });

        if (duplicateSection) {
            return res.status(409).json({
                error: "Section with this name already exists for the selected grade"
            });
        }

        const newSection = await Section.create({
            school_id,
            grade_id,
            sectionName,
            shortCode,
            status,
        });

        return res.status(201).json({
            message: "Section created successfully",
            section: newSection
        });
    } catch (error) {
        console.error("Error creating section:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllSections = async (req, res) => {
    try {
        const sections = await Section.findAll({
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });
        return res.json({ sections });
    } catch (error) {
        console.error("Error fetching sections:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getSectionsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID is required." });

        const sections = await Section.findAll({
            where: { school_id },
            include: [{ model: Grade, attributes: ["id", "grade"] }],
            attributes: ["id", "sectionName", "shortCode", "status"]
        });

        res.status(200).json({ sections });
    } catch (error) {
        console.error("Error fetching sections:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getSectionsBySchoolAndGrade = async (req, res) => {
    try {
        const schoolId = parseInt(req.params.school_id, 10);
        const gradeId = parseInt(req.params.grade_id, 10);

        if (!schoolId || !gradeId)
            return res.status(400).json({ error: "School ID and Grade ID are required." });

        const sections = await Section.findAll({
            where: { school_id: schoolId, grade_id: gradeId },
            attributes: ["id", "sectionName", "shortCode", "status"]
        });

        return res.status(200).json({ sections });
    } catch (error) {
        console.error("Error fetching sections by school and grade:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// controller.getSectionsByFilter = async (req, res) => {
//   try {
//     const { school_id, academicYear, grade_id } = req.query;

//     if (!school_id || !academicYear || !grade_id) {
//       return res.status(400).json({
//         message: "school_id, academicYear and grade_id are required"
//       });
//     }

//     const sections = await Section.findAll({
//       where: {
//         school_id,
//         academicYear,
//         grade_id,
//         status: 1
//       },
//       order: [["sectionName", "ASC"]]
//     });

//     res.json({ sections });
//   } catch (error) {
//     console.error("Error fetching sections:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


// ✅ New: Soft Delete (status update)
controller.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const section = await Section.findByPk(id);
        if (!section) return res.status(404).json({ error: "Section not found" });

        await section.update({ status });
        res.json({ message: "Section status updated successfully" });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getSectionById = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) return res.status(404).json({ error: "Section not found" });
    res.json({ section });
  } catch (error) {
    console.error("Error fetching section:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

controller.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id, grade_id, sectionName, shortCode } = req.body;
    const section = await Section.findByPk(id);
    if (!section) return res.status(404).json({ error: "Section not found" });

    await section.update({ school_id, grade_id, sectionName, shortCode });
    res.json({ message: "Section updated successfully" });
  } catch (error) {
    console.error("Error updating section:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;
