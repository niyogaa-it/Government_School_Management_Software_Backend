const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");

const PromotionHistoryHSC = sequelize.define("PromotionHistoryHSC", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "References Studenthsc.id",
  },

  // ── Snapshot of student at time of promotion ────────────────────────────────
  studentName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admissionNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // ── Academic state BEFORE promotion ────────────────────────────────────────
  fromAcademicYear: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  from_grade_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "grade", key: "id" },
  },
  from_section_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "section", key: "id" },
  },

  // ── Academic state AFTER promotion ─────────────────────────────────────────
  // NOTE: For HSC promotion, grade & section remain the same — only academicYear advances.
  toAcademicYear: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  to_grade_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "grade", key: "id" },
  },
  to_section_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "section", key: "id" },
  },

  // ── School reference ────────────────────────────────────────────────────────
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "school", key: "id" },
  },

  // ── Audit ───────────────────────────────────────────────────────────────────
  dateOfPromotion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  type: {
    type: DataTypes.ENUM("promotion", "demotion"),
    defaultValue: "promotion",
    allowNull: false,
  }

}, {
  timestamps: false,
  tableName: "PromotionHistoryHSC",
});

// Associations for joined queries
PromotionHistoryHSC.belongsTo(School, { foreignKey: "school_id" });
PromotionHistoryHSC.belongsTo(Grade, { foreignKey: "from_grade_id", as: "FromGrade" });
PromotionHistoryHSC.belongsTo(Section, { foreignKey: "from_section_id", as: "FromSection" });
PromotionHistoryHSC.belongsTo(Grade, { foreignKey: "to_grade_id", as: "ToGrade" });
PromotionHistoryHSC.belongsTo(Section, { foreignKey: "to_section_id", as: "ToSection" });

module.exports = PromotionHistoryHSC;
