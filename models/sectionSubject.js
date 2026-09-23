const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ─────────────────────────────────────────────────────────────────────────────
// SectionSubject — one row per subject attached to a Section via the
// "Attach Subject" drawer on the Study Plan screen. Also carries the
// per-section "Properties" for that subject (Name as in report card,
// Max/Min/Passing Mark, Grade Period) edited via the pencil icon in the
// subject table.
//
// Associations (Section -> Subjects, SectionSubject -> Subject, and
// Section -> Instructor as ClassTeacher) are defined centrally in
// models/index.js — same pattern already used for Instructor/InstructorSubject.
// Do NOT redeclare belongsTo/hasMany here.
// ─────────────────────────────────────────────────────────────────────────────
const SectionSubject = sequelize.define("SectionSubject", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "section", key: "id" },
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "subject", key: "id" },
    },
    // ── Properties (edited via the pencil icon / "Properties - <Subject> - <SectionCode>" modal) ──
    name_as_in_report_card: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    max_mark: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 100,
    },
    min_mark: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 35,
    },
    passing_mark: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 35,
    },
    grade_period: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: false,
    tableName: "section_subject",
    indexes: [
        { unique: true, fields: ["section_id", "subject_id"] },
    ],
});

module.exports = SectionSubject;