const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ─────────────────────────────────────────────────────────────────────────────
// InstructorSubject — one row per (Grade, Subject) an instructor is assigned
// to teach. This is what backs the dynamic "Add Row" Grade/Subject table
// on the Create/Edit Instructor form.
//
// NOTE: All associations for this model are defined centrally in
// models/index.js. Do NOT redeclare belongsTo/hasMany here.
// ─────────────────────────────────────────────────────────────────────────────
const InstructorSubject = sequelize.define("InstructorSubject", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "instructor",
            key: "id",
        },
    },
    grade_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "grade",
            key: "id",
        },
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "subject",
            key: "id",
        },
    },
    // Which academic year this specific grade/subject assignment applies to.
    // Lets one instructor row carry a full teaching history across years
    // (e.g. "Grade 5 - Math" in 2025-2026, "Grade 6 - Science" in 2026-2027).
    academic_year: {
        type: DataTypes.STRING,
        allowNull: true, // nullable at the DB level so existing rows aren't broken by the migration; app layer requires it for new rows
    },
}, {
    timestamps: false,
    tableName: "instructor_subject",
});

module.exports = InstructorSubject;