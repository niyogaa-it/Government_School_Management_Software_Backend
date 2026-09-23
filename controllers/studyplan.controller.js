const { Section, School, Grade, SectionSubject, Studentsslc, Studenthsc } = require("../models");

const controller = {};

// A "Study Plan" isn't its own table — it's every (school, academic_year) pair
// that has at least one Section with at least one Subject attached. The
// composite id "<school_id>::<academic_year>" is what the frontend uses for
// the Edit/View/Delete links, since there's no single row to reference.
const makeId = (school_id, academic_year) => `${school_id}::${academic_year}`;
const parseId = (id) => {
    const idx = id.indexOf("::");
    if (idx === -1) return null;
    return { school_id: id.slice(0, idx), academic_year: id.slice(idx + 2) };
};

// Group a flat list of Sections (each with school_id/academic_year/School) into
// one row per distinct (school_id, academic_year) combo.
const dedupeToStudyPlans = (sections) => {
    const map = new Map();
    for (const s of sections) {
        const key = makeId(s.school_id, s.academic_year);
        if (!map.has(key)) {
            map.set(key, {
                id: key,
                school_id: s.school_id,
                academic_year: s.academic_year,
                School: s.School ? { id: s.School.id, name: s.School.name } : null,
            });
        }
    }
    return Array.from(map.values());
};

// ─────────────────────────────────────────────
// Get All Study Plans
// GET /studyplan/getAllStudyPlans
// ─────────────────────────────────────────────
controller.getAllStudyPlans = async (req, res) => {
    try {
        const sections = await Section.findAll({
            where: { status: 1 },
            attributes: ["id", "school_id", "academic_year"],
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: SectionSubject, as: "Subjects", required: true, attributes: [] },
            ],
        });
        return res.status(200).json({ studyPlans: dedupeToStudyPlans(sections) });
    } catch (error) {
        console.error("Error fetching study plans:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Get Study Plans by School
// GET /studyplan/getStudyPlansBySchool/:school_id
// ─────────────────────────────────────────────
controller.getStudyPlansBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        const sections = await Section.findAll({
            where: { status: 1, school_id },
            attributes: ["id", "school_id", "academic_year"],
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: SectionSubject, as: "Subjects", required: true, attributes: [] },
            ],
        });
        return res.status(200).json({ studyPlans: dedupeToStudyPlans(sections) });
    } catch (error) {
        console.error("Error fetching study plans by school:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Get Study Plans by School & Year
// GET /studyplan/getStudyPlansBySchoolAndYear/:school_id/:academic_year
// (Kept as a list endpoint for consistency with the others — will contain
// 0 or 1 entries since school+year is exactly the grouping key.)
// ─────────────────────────────────────────────
controller.getStudyPlansBySchoolAndYear = async (req, res) => {
    try {
        const { school_id, academic_year } = req.params;
        const sections = await Section.findAll({
            where: { status: 1, school_id, academic_year },
            attributes: ["id", "school_id", "academic_year"],
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: SectionSubject, as: "Subjects", required: true, attributes: [] },
            ],
        });
        return res.status(200).json({ studyPlans: dedupeToStudyPlans(sections) });
    } catch (error) {
        console.error("Error fetching study plans by school and year:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Get full read-only detail for one Study Plan (the "View" modal)
// GET /studyplan/getStudyPlanDetail/:school_id/:academic_year
// Returns every grade -> section -> subject/student counts for that school+year.
// ─────────────────────────────────────────────
controller.getStudyPlanDetail = async (req, res) => {
    try {
        const { school_id, academic_year } = req.params;

        const school = await School.findByPk(school_id, { attributes: ["id", "name"] });
        if (!school) return res.status(404).json({ error: "School not found" });

        const sections = await Section.findAll({
            where: { status: 1, school_id, academic_year },
            include: [
                { model: Grade, attributes: ["id", "grade"] },
                { model: SectionSubject, as: "Subjects", attributes: ["id"] },
            ],
            order: [["grade_id", "ASC"], ["sectionName", "ASC"]],
        });

        const sectionsWithCounts = await Promise.all(sections.map(async (section) => {
            const [sslcCount, hscCount] = await Promise.all([
                Studentsslc.count({ where: { section_id: section.id, status: "active" } }),
                Studenthsc.count({ where: { section_id: section.id, status: "active" } }),
            ]);
            return {
                id: section.id,
                sectionName: section.sectionName,
                gradeId: section.Grade?.id ?? null,
                gradeName: section.Grade?.grade ?? "Unknown",
                subjectCount: (section.Subjects || []).length,
                activeStudentCount: sslcCount + hscCount,
            };
        }));

        // Group flat section list by grade for a clean grade -> sections view.
        const gradeMap = new Map();
        for (const s of sectionsWithCounts) {
            if (!gradeMap.has(s.gradeId)) gradeMap.set(s.gradeId, { gradeId: s.gradeId, gradeName: s.gradeName, sections: [] });
            gradeMap.get(s.gradeId).sections.push(s);
        }

        return res.status(200).json({
            school: { id: school.id, name: school.name },
            academic_year,
            grades: Array.from(gradeMap.values()),
        });
    } catch (error) {
        console.error("Error fetching study plan detail:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Delete a Study Plan
// DELETE /studyplan/deleteStudyPlan/:id   (id = "<school_id>::<academic_year>")
//
// There's no single "study plan" row to delete — this clears the data that
// makes the plan show up in the list: it detaches every subject and clears
// the class-teacher assignment from every section under that school+year.
// Sections and Grades themselves are left untouched (students still
// reference section_id), so this is reversible by re-attaching subjects.
// ─────────────────────────────────────────────
controller.deleteStudyPlan = async (req, res) => {
    try {
        const parsed = parseId(req.params.id);
        if (!parsed) return res.status(400).json({ error: "Invalid study plan id" });
        const { school_id, academic_year } = parsed;

        const sections = await Section.findAll({ where: { school_id, academic_year, status: 1 }, attributes: ["id"] });
        if (sections.length === 0) return res.status(404).json({ error: "Study plan not found" });

        const sectionIds = sections.map(s => s.id);

        await SectionSubject.destroy({ where: { section_id: sectionIds } });
        await Section.update({ class_teacher_id: null }, { where: { id: sectionIds } });

        return res.status(200).json({ message: "Study plan deleted successfully" });
    } catch (error) {
        console.error("Error deleting study plan:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;
