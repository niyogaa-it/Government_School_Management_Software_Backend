const { Section, School, Grade, Instructor, SectionSubject, Subject, Studentsslc, Studenthsc } = require("../models");

const controller = {};

controller.createSection = async (req, res) => {
    try {
        const { school_id, academic_year, grade_id, sectionName, shortCode, status } = req.body;

        const school = await School.findByPk(school_id);
        const grade = await Grade.findByPk(grade_id);

        if (!school || !grade) {
            return res.status(404).json({ error: "School or Grade not found" });
        }

        const duplicateSection = await Section.findOne({
            where: { school_id, academic_year, grade_id, sectionName }
        });

        if (duplicateSection) {
            return res.status(409).json({
                error: "Section with this name already exists for the selected grade"
            });
        }

        const newSection = await Section.create({
            school_id,
            academic_year,
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
            attributes: ["id", "sectionName", "academic_year", "shortCode", "status"]
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
            attributes: ["id", "sectionName", "academic_year", "shortCode", "status"]
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
    const { school_id, grade_id, academic_year, sectionName, shortCode } = req.body;
    const section = await Section.findByPk(id);
    if (!section) return res.status(404).json({ error: "Section not found" });

    await section.update({ school_id, grade_id, academic_year, sectionName, shortCode });
    res.json({ message: "Section updated successfully" });
  } catch (error) {
    console.error("Error updating section:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

controller.getSectionsBySchoolAndYear = async (req, res) => {
    try {
        const { school_id, academic_year } = req.params;
        if (!school_id || !academic_year)
            return res.status(400).json({ message: "School ID and Academic Year are required." });

        const sections = await Section.findAll({
            where: { school_id, academic_year, status: 1 },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: ["id", "academic_year", "sectionName", "shortCode", "status"]
        });

        res.status(200).json({ sections });
    } catch (error) {
        console.error("Error fetching sections by school and year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
controller.getSectionsForStudyPlan = async (req, res) => {
    try {
        const { school_id, grade_id, academic_year } = req.params;
        if (!school_id || !grade_id || !academic_year) {
            return res.status(400).json({ error: "school_id, grade_id and academic_year are required" });
        }
 
        const sections = await Section.findAll({
            where: { school_id, grade_id, academic_year, status: 1 },
            include: [
                { model: Instructor, as: "ClassTeacher", attributes: ["id", "name"] },
                {
                    model: SectionSubject,
                    as: "Subjects",
                    include: [{ model: Subject, attributes: ["id", "subjectName", "shortCode"] }],
                },
            ],
            order: [["sectionName", "ASC"]],
        });

        // A section can hold SSLC students, HSC students, or both — sum the active
        // headcount across both tables so the "N Student's" pill is always accurate.
        const sectionsWithCounts = await Promise.all(sections.map(async (section) => {
            const [sslcCount, hscCount] = await Promise.all([
                Studentsslc.count({ where: { section_id: section.id, status: "active" } }),
                Studenthsc.count({ where: { section_id: section.id, status: "active" } }),
            ]);
            const plain = section.toJSON();
            plain.activeStudentCount = sslcCount + hscCount;
            return plain;
        }));

        return res.status(200).json({ sections: sectionsWithCounts });
    } catch (error) {
        console.error("Error fetching sections for study plan:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
 
// ─────────────────────────────────────────────
// Attach Subjects to a Section
// Body: { subject_ids: [1, 2, 3] }
// Skips subjects already attached; never duplicates a row.
// ─────────────────────────────────────────────
controller.attachSubjects = async (req, res) => {
    try {
        const { id } = req.params; // section id
        const { subject_ids } = req.body;
 
        const section = await Section.findByPk(id);
        if (!section) return res.status(404).json({ error: "Section not found" });
 
        if (!Array.isArray(subject_ids) || subject_ids.length === 0) {
            return res.status(400).json({ error: "subject_ids must be a non-empty array" });
        }
 
        const existing = await SectionSubject.findAll({ where: { section_id: id }, attributes: ["subject_id"] });
        const existingIds = new Set(existing.map(r => r.subject_id));
        const toInsert = subject_ids.filter(sid => !existingIds.has(sid));
 
        if (toInsert.length > 0) {
            await SectionSubject.bulkCreate(toInsert.map(subject_id => ({ section_id: id, subject_id })));
        }
 
        return res.status(200).json({ message: "Subjects attached successfully" });
    } catch (error) {
        console.error("Error attaching subjects:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
 
// ─────────────────────────────────────────────
// Update a Section-Subject's Properties (pencil icon -> "Properties" modal)
// Body: { name_as_in_report_card, max_mark, min_mark, passing_mark, grade_period }
// :id here is the SectionSubject row id (row.id in the subject table)
// ─────────────────────────────────────────────
controller.updateSectionSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_as_in_report_card, max_mark, min_mark, passing_mark, grade_period } = req.body;

        const sectionSubject = await SectionSubject.findByPk(id);
        if (!sectionSubject) return res.status(404).json({ error: "Section subject not found" });

        if (max_mark != null && min_mark != null && Number(min_mark) > Number(max_mark)) {
            return res.status(400).json({ error: "Min Mark cannot be greater than Max Mark" });
        }

        await sectionSubject.update({
            name_as_in_report_card,
            max_mark,
            min_mark,
            passing_mark,
            grade_period,
        });

        return res.status(200).json({ message: "Subject properties updated successfully", sectionSubject });
    } catch (error) {
        console.error("Error updating section subject:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Detach a single Subject from a Section (the × in the Actions column)
// ─────────────────────────────────────────────
controller.detachSubject = async (req, res) => {
    try {
        const { id, subject_id } = req.params;
        const deleted = await SectionSubject.destroy({ where: { section_id: id, subject_id } });
        if (!deleted) return res.status(404).json({ error: "Subject not attached to this section" });
        return res.status(200).json({ message: "Subject removed from section" });
    } catch (error) {
        console.error("Error detaching subject:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
 
// ─────────────────────────────────────────────
// Allocate Class Teacher (3-dot menu -> "Allocate Class Teacher")
// Body: { instructor_id }
// ─────────────────────────────────────────────
controller.allocateClassTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const { instructor_id } = req.body;
        if (!instructor_id) return res.status(400).json({ error: "instructor_id is required" });
 
        const section = await Section.findByPk(id);
        if (!section) return res.status(404).json({ error: "Section not found" });
 
        const instructor = await Instructor.findByPk(instructor_id);
        if (!instructor) return res.status(404).json({ error: "Instructor not found" });
 
        await section.update({ class_teacher_id: instructor_id });
        return res.status(200).json({ message: "Class teacher allocated successfully" });
    } catch (error) {
        console.error("Error allocating class teacher:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
 
// ─────────────────────────────────────────────
// Clone Subjects from one Section to other Sections of the same Grade
// (3-dot menu -> "Clone Subjects To...")
// Body: { source_section_id, target_section_ids: [2, 3] }
// Only fills in subjects the target is missing — never removes anything
// already on the target section.
// ─────────────────────────────────────────────
controller.cloneSubjects = async (req, res) => {
    try {
        const { source_section_id, target_section_ids } = req.body;
        if (!source_section_id || !Array.isArray(target_section_ids) || target_section_ids.length === 0) {
            return res.status(400).json({ error: "source_section_id and target_section_ids[] are required" });
        }
 
        const sourceRows = await SectionSubject.findAll({ where: { section_id: source_section_id } });
        if (sourceRows.length === 0) {
            return res.status(400).json({ error: "Source section has no subjects to clone" });
        }
 
        for (const targetId of target_section_ids) {
            const existing = await SectionSubject.findAll({ where: { section_id: targetId }, attributes: ["subject_id"] });
            const existingIds = new Set(existing.map(r => r.subject_id));
 
            const rowsToInsert = sourceRows
                .filter(r => !existingIds.has(r.subject_id))
                .map(r => ({
                    section_id: targetId,
                    subject_id: r.subject_id,
                    name_as_in_report_card: r.name_as_in_report_card,
                    max_mark: r.max_mark,
                    min_mark: r.min_mark,
                    passing_mark: r.passing_mark,
                    grade_period: r.grade_period,
                }));
 
            if (rowsToInsert.length > 0) {
                await SectionSubject.bulkCreate(rowsToInsert);
            }
        }
 
        return res.status(200).json({ message: "Subjects cloned successfully" });
    } catch (error) {
        console.error("Error cloning subjects:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;