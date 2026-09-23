const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ─────────────────────────────────────────────────────────────────────────────
// Instructor (Teacher) model
// One row per teacher. Which Grade+Subject combinations they teach is stored
// separately in InstructorSubject (see instructorsubject.js) so a teacher can
// be mapped to any number of grade/subject pairs — mirrors the "Add Row"
// Program/Subject table in the create form.
//
// NOTE: All associations for this model are defined centrally in
// models/index.js. Do NOT redeclare belongsTo/hasMany here — doing so in
// both places is what caused the "alias used in two separate associations"
// crash on boot.
// ─────────────────────────────────────────────────────────────────────────────
const Instructor = sequelize.define("Instructor", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    school_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "school",
            key: "id",
        },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    gender: {
        type: DataTypes.STRING, // "Male" | "Female" | "Other"
        allowNull: true,
    },
    instructorType: {
        type: DataTypes.ENUM("Academic", "Non Academic"),
        allowNull: false,
        defaultValue: "Academic",
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    dateOfJoining: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    qualification: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    workExperience: {
        type: DataTypes.STRING, // e.g. "5 years"
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true },
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1 = active, 0 = soft-deleted
    },
}, {
    timestamps: true,
    tableName: "instructor",
});

module.exports = Instructor;