const db = require("../models");
const {
    Section, School, Grade, Subject,
    SectionSubject, SectionSubjectTeacher, Instructor, InstructorSubject,
} = db;
const { Op } = require("sequelize");
const sequelize = require("../config/database");

const controller = {};

// ─────────────────────────────────────────────────────────────────────────────
// Get the full editor payload for one Section: every subject attached to it,
// who is currently Primary/Secondary for each, and the pool of instructors
// eligible to be picked (i.e. instructors who already have that exact
// Grade + Subject assigned to them via InstructorSubject).
//
// GET /teacherAllocation/getFormData/:school_id/:grade_id/:section_id/:academic_year
// ─────────────────────────────────────────────────────────────────────────────
controller.getFormData = async (req, res) => {
    try {
        const { school_id, grade_id, section_id, academic_year } = req.params;

        const section = await Section.findOne({
            where: { id: section_id, school_id, grade_id, academic_year, status: 1 },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] },
            ],
        });
        if (!section) {
            return res.status(404).json({ error: "Section not found for this school, grade and academic year" });
        }

        const sectionSubjects = await SectionSubject.findAll({
            where: { section_id },
            include: [
                { model: Subject, attributes: ["id", "subjectName", "shortCode"] },
                {
                    model: SectionSubjectTeacher,
                    as: "Teachers",
                    include: [{ model: Instructor, as: "Instructor", attributes: ["id", "name"] }],
                },
            ],
        });

        if (sectionSubjects.length === 0) {
            return res.status(404).json({ error: "No subjects are attached to this section yet. Attach subjects from the Study Plan screen first." });
        }

        // Eligible instructors per subject = instructors with an InstructorSubject
        // row for this exact school + grade + subject. Academic year on that
        // mapping is honored when set, but older rows may have it as null
        // (see instructorsubject.js), so those are treated as "any year".
        const subjectIds = sectionSubjects.map(ss => ss.subject_id);
        const eligibleRows = await InstructorSubject.findAll({
            where: {
                grade_id,
                subject_id: subjectIds,
                academic_year: { [Op.or]: [academic_year, null] },
            },
            include: [{ model: Instructor, attributes: ["id", "name"], where: { school_id, status: 1 } }],
        });

        const eligibleBySubject = new Map();
        for (const row of eligibleRows) {
            if (!row.Instructor) continue;
            if (!eligibleBySubject.has(row.subject_id)) eligibleBySubject.set(row.subject_id, []);
            const list = eligibleBySubject.get(row.subject_id);
            if (!list.some(i => i.id === row.Instructor.id)) {
                list.push({ id: row.Instructor.id, name: row.Instructor.name });
            }
        }

        let hasExistingAllocation = false;
        const subjects = sectionSubjects.map(ss => {
            const teacherRows = ss.Teachers || [];
            const primaryInstructorIds = teacherRows.filter(t => t.role === "Primary").map(t => t.instructor_id);
            const secondaryInstructorIds = teacherRows.filter(t => t.role === "Secondary").map(t => t.instructor_id);
            if (primaryInstructorIds.length > 0 || secondaryInstructorIds.length > 0) hasExistingAllocation = true;

            return {
                section_subject_id: ss.id,
                subject_id: ss.subject_id,
                subjectName: ss.Subject?.subjectName || "Unknown",
                shortCode: ss.Subject?.shortCode || "",
                eligibleInstructors: eligibleBySubject.get(ss.subject_id) || [],
                primaryInstructorIds,
                secondaryInstructorIds,
            };
        });

        return res.status(200).json({
            section: {
                id: section.id,
                sectionName: section.sectionName,
                shortCode: section.shortCode,
                academic_year: section.academic_year,
                school_id: section.school_id,
                grade_id: section.grade_id,
                School: section.School ? { id: section.School.id, name: section.School.name } : null,
                Grade: section.Grade ? { id: section.Grade.id, grade: section.Grade.grade } : null,
            },
            subjects,
            hasExistingAllocation,
        });
    } catch (error) {
        console.error("Error fetching teacher allocation form data:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Save (create or update — same thing, since it's keyed by section_id) the
// Primary/Secondary teacher lists for every subject on a section.
//
// POST /teacherAllocation/save/:section_id
// Body: { allocations: [{ subject_id, primary_instructor_ids: [], secondary_instructor_ids: [] }] }
//
// Full-replace per subject, same pattern as Instructor.updateInstructor's
// handling of InstructorSubject rows: wipe what's there for that
// section-subject, re-insert what was submitted.
// ─────────────────────────────────────────────────────────────────────────────
controller.saveAllocation = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { section_id } = req.params;
        const { allocations } = req.body;

        if (!Array.isArray(allocations) || allocations.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "allocations[] is required" });
        }

        const sectionSubjects = await SectionSubject.findAll({ where: { section_id }, transaction });
        if (sectionSubjects.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "No subjects attached to this section" });
        }
        const sectionSubjectIdBySubjectId = new Map(sectionSubjects.map(ss => [ss.subject_id, ss.id]));

        for (const item of allocations) {
            const sectionSubjectId = sectionSubjectIdBySubjectId.get(item.subject_id);
            if (!sectionSubjectId) continue; // subject isn't actually attached to this section — ignore

            await SectionSubjectTeacher.destroy({ where: { section_subject_id: sectionSubjectId }, transaction });

            const rows = [];
            for (const instructorId of new Set(item.primary_instructor_ids || [])) {
                rows.push({ section_subject_id: sectionSubjectId, instructor_id: instructorId, role: "Primary" });
            }
            for (const instructorId of new Set(item.secondary_instructor_ids || [])) {
                rows.push({ section_subject_id: sectionSubjectId, instructor_id: instructorId, role: "Secondary" });
            }
            if (rows.length > 0) await SectionSubjectTeacher.bulkCreate(rows, { transaction });
        }

        await transaction.commit();
        return res.status(200).json({ message: "Teacher allocation saved successfully" });
    } catch (error) {
        await transaction.rollback();
        console.error("Error saving teacher allocation:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// List views (for the Teacher Allocation List screen). One row per Section
// that has at least one Primary/Secondary teacher saved anywhere in it.
// ─────────────────────────────────────────────────────────────────────────────
const teacherAllocationInclude = [
    { model: School, attributes: ["id", "name"] },
    { model: Grade, attributes: ["id", "grade"] },
    {
        model: SectionSubject,
        as: "Subjects",
        include: [{ model: SectionSubjectTeacher, as: "Teachers", attributes: ["id", "role"] }],
    },
];

const toAllocationRow = (section) => {
    const subjects = section.Subjects || [];
    const teacherCount = subjects.reduce((sum, ss) => sum + (ss.Teachers || []).length, 0);
    return {
        section_id: section.id,
        sectionName: section.sectionName,
        academic_year: section.academic_year,
        School: section.School ? { id: section.School.id, name: section.School.name } : null,
        Grade: section.Grade ? { id: section.Grade.id, grade: section.Grade.grade } : null,
        subjectCount: subjects.length,
        teacherCount,
    };
};

// Only keep sections where at least one subject has at least one teacher row.
const withAnyTeacher = (sections) =>
    sections.filter(s => (s.Subjects || []).some(ss => (ss.Teachers || []).length > 0)).map(toAllocationRow);

// GET /teacherAllocation/getAllAllocations
controller.getAllAllocations = async (req, res) => {
    try {
        const sections = await Section.findAll({ where: { status: 1 }, include: teacherAllocationInclude });
        return res.status(200).json({ allocations: withAnyTeacher(sections) });
    } catch (error) {
        console.error("Error fetching teacher allocations:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// GET /teacherAllocation/getAllocationsBySchool/:school_id
controller.getAllocationsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        const sections = await Section.findAll({ where: { status: 1, school_id }, include: teacherAllocationInclude });
        return res.status(200).json({ allocations: withAnyTeacher(sections) });
    } catch (error) {
        console.error("Error fetching teacher allocations by school:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// GET /teacherAllocation/getAllocationsBySchoolAndYear/:school_id/:academic_year
controller.getAllocationsBySchoolAndYear = async (req, res) => {
    try {
        const { school_id, academic_year } = req.params;
        const sections = await Section.findAll({ where: { status: 1, school_id, academic_year }, include: teacherAllocationInclude });
        return res.status(200).json({ allocations: withAnyTeacher(sections) });
    } catch (error) {
        console.error("Error fetching teacher allocations by school/year:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Clear every Primary/Secondary teacher from a section (the "Delete" action
// on the list). Subjects stay attached — this only removes teacher rows,
// same reversible spirit as Study Plan's delete.
//
// DELETE /teacherAllocation/deleteAllocation/:section_id
// ─────────────────────────────────────────────────────────────────────────────
controller.deleteAllocation = async (req, res) => {
    try {
        const { section_id } = req.params;
        const sectionSubjects = await SectionSubject.findAll({ where: { section_id }, attributes: ["id"] });
        const ids = sectionSubjects.map(ss => ss.id);
        if (ids.length === 0) return res.status(404).json({ error: "No subjects attached to this section" });

        await SectionSubjectTeacher.destroy({ where: { section_subject_id: ids } });
        return res.status(200).json({ message: "Teacher allocation cleared successfully" });
    } catch (error) {
        console.error("Error clearing teacher allocation:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;
