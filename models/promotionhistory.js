const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");

const PromotionHistory = sequelize.define("PromotionHistory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "References Studentsslc.id",
  },

  // ── Snapshot of student at time of promotion/demotion ──────────────────────
  studentName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admissionNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // ── Academic state BEFORE promotion/demotion ───────────────────────────────
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

  // ── Academic state AFTER promotion/demotion ────────────────────────────────
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

  studentType: {
    type: DataTypes.ENUM("new", "old"),
    allowNull: true,
  },

  // ── Type: promotion or demotion ─────────────────────────────────────────────
  type: {
    type: DataTypes.ENUM("promotion", "demotion"),
    defaultValue: "promotion",
    allowNull: false,
  },
}, {
  timestamps: false,
  tableName: "PromotionHistory",
});

// Associations for joined queries
PromotionHistory.belongsTo(School, { foreignKey: "school_id" });
PromotionHistory.belongsTo(Grade, { foreignKey: "from_grade_id", as: "FromGrade" });
PromotionHistory.belongsTo(Section, { foreignKey: "from_section_id", as: "FromSection" });
PromotionHistory.belongsTo(Grade, { foreignKey: "to_grade_id", as: "ToGrade" });
PromotionHistory.belongsTo(Section, { foreignKey: "to_section_id", as: "ToSection" });

module.exports = PromotionHistory;