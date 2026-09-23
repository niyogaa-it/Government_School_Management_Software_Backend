const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ─────────────────────────────────────────────────────────────────────────────
// SectionSubjectTeacher — one row per (SectionSubject, Instructor, role).
//
// This is what backs the "Select Primary Teachers" / "Select Secondary
// Teachers" multi-selects on the Teacher Allocation screen. A single
// SectionSubject (= one subject, scoped to one section) can have any number
// of Primary and Secondary teachers attached — there's no cap, the dropdowns
// support 15+ selections each.
//
// Only instructors who already have a matching InstructorSubject row
// (same school, grade, subject, academic_year) are offered as options in
// the UI — this table doesn't enforce that itself, the controller does,
// so it stays a plain join table.
//
// Associations (SectionSubjectTeacher -> Instructor, SectionSubject -> Teachers)
// are defined centrally in models/index.js — same pattern as every other
// join table in this app (InstructorSubject, SectionSubject). Do NOT
// redeclare belongsTo/hasMany here. See the bottom of this file for the
// exact lines to add there.
// ─────────────────────────────────────────────────────────────────────────────
const SectionSubjectTeacher = sequelize.define("SectionSubjectTeacher", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    section_subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "section_subject", key: "id" },
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "instructor", key: "id" },
    },
    role: {
        type: DataTypes.ENUM("Primary", "Secondary"),
        allowNull: false,
    },
}, {
    timestamps: false,
    tableName: "section_subject_teacher",
    indexes: [
        // Same instructor can't be added twice in the same role for the same
        // section-subject. (They CAN appear once as Primary and once as
        // Secondary for the same subject if you want to allow that — the
        // frontend nudges against it but doesn't hard-block it.)
        { unique: true, fields: ["section_subject_id", "instructor_id", "role"] },
    ],
});

module.exports = SectionSubjectTeacher;
