const db = require("../models");
const { Instructor, InstructorSubject, School, Grade, Subject } = db;
const sequelize = require("../config/database");

const controller = {};

// Shape expected for each row in req.body.subjects: { grade_id, subject_id }
const buildSubjectRows = (instructorId, subjects = []) =>
    (subjects || [])
        .filter(s => s && s.academic_year && s.grade_id && s.subject_id)
        .map(s => ({
            instructor_id: instructorId,
            academic_year: s.academic_year,
            grade_id: s.grade_id,
            subject_id: s.subject_id,
        }));

const includeForInstructor = [
    { model: School, attributes: ["id", "name"] },
    {
        model: InstructorSubject,
        as: "Subjects",
        include: [
            { model: Grade, attributes: ["id", "grade"] },
            { model: Subject, attributes: ["id", "subjectName", "shortCode"] },
        ],
    },
];

// ─────────────────────────────────────────────
// Create Instructor
// Body: { school_id, name, gender, instructorType, designation,
//         dateOfJoining, qualification, workExperience,
//         email, phone, subjects: [{ grade_id, subject_id }, ...] }
// ─────────────────────────────────────────────
controller.createInstructor = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            school_id, name, gender, instructorType,
            designation, dateOfJoining, qualification, workExperience,
            email, phone, subjects,
        } = req.body;

        if (!school_id || !name) {
            await transaction.rollback();
            return res.status(400).json({ error: "School and Name are required" });
        }

        const schoolExists = await School.findByPk(school_id, { transaction });
        if (!schoolExists) {
            await transaction.rollback();
            return res.status(404).json({ error: "School not found" });
        }

        const newInstructor = await Instructor.create({
            school_id,
            name: name.trim(),
            gender: gender || null,
            instructorType: instructorType || "Academic",
            designation: designation || null,
            dateOfJoining: dateOfJoining || null,
            qualification: qualification || null,
            workExperience: workExperience || null,
            email: email || null,
            phone: phone || null,
            status: 1,
        }, { transaction });

        const subjectRows = buildSubjectRows(newInstructor.id, subjects);
        if (subjectRows.length > 0) {
            await InstructorSubject.bulkCreate(subjectRows, { transaction });
        }

        await transaction.commit();

        const created = await Instructor.findByPk(newInstructor.id, { include: includeForInstructor });
        return res.status(201).json({ message: "Instructor created successfully", instructor: created });
    } catch (error) {
        await transaction.rollback();
        console.error("Error creating instructor:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Get All Instructors
// ─────────────────────────────────────────────
controller.getAllInstructors = async (req, res) => {
    try {
        const instructors = await Instructor.findAll({
            where: { status: 1 },
            include: includeForInstructor,
            order: [["id", "DESC"]],
        });
        return res.json({ instructors });
    } catch (error) {
        console.error("Error fetching instructors:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Get Instructors by School
// ─────────────────────────────────────────────
controller.getInstructorsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID is required." });

        const instructors = await Instructor.findAll({
            where: { school_id, status: 1 },
            include: includeForInstructor,
            order: [["id", "DESC"]],
        });

        return res.status(200).json({ instructors });
    } catch (error) {
        console.error("Error fetching instructors:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Get Single Instructor (for View / Edit)
// ─────────────────────────────────────────────
controller.getInstructorById = async (req, res) => {
    try {
        const { id } = req.params;
        const instructor = await Instructor.findOne({
            where: { id, status: 1 },
            include: includeForInstructor,
        });
        if (!instructor) return res.status(404).json({ error: "Instructor not found" });
        return res.status(200).json({ instructor });
    } catch (error) {
        console.error("Error fetching instructor:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Update Instructor (replaces the grade/subject rows entirely)
// ─────────────────────────────────────────────
controller.updateInstructor = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            school_id, name, gender, instructorType,
            designation, dateOfJoining, qualification, workExperience,
            email, phone, subjects,
        } = req.body;

        const instructor = await Instructor.findByPk(id, { transaction });
        if (!instructor) {
            await transaction.rollback();
            return res.status(404).json({ error: "Instructor not found" });
        }

        await instructor.update({
            school_id: school_id ?? instructor.school_id,
            name: name ? name.trim() : instructor.name,
            gender: gender ?? instructor.gender,
            instructorType: instructorType ?? instructor.instructorType,
            designation: designation ?? instructor.designation,
            dateOfJoining: dateOfJoining ?? instructor.dateOfJoining,
            qualification: qualification ?? instructor.qualification,
            workExperience: workExperience ?? instructor.workExperience,
            email: email ?? instructor.email,
            phone: phone ?? instructor.phone,
        }, { transaction });

        if (Array.isArray(subjects)) {
            await InstructorSubject.destroy({ where: { instructor_id: id }, transaction });
            const subjectRows = buildSubjectRows(id, subjects);
            if (subjectRows.length > 0) {
                await InstructorSubject.bulkCreate(subjectRows, { transaction });
            }
        }

        await transaction.commit();

        const updated = await Instructor.findByPk(id, { include: includeForInstructor });
        return res.status(200).json({ message: "Instructor updated successfully", instructor: updated });
    } catch (error) {
        await transaction.rollback();
        console.error("Error updating instructor:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// Soft Delete Instructor
// ─────────────────────────────────────────────
controller.deleteInstructor = async (req, res) => {
    try {
        const { id } = req.params;
        const instructor = await Instructor.findByPk(id);
        if (!instructor) return res.status(404).json({ error: "Instructor not found" });

        await instructor.update({ status: 0 });
        return res.status(200).json({ message: "Instructor deleted successfully" });
    } catch (error) {
        console.error("Error deleting instructor:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;