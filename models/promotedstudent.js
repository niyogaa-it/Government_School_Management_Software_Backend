// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/database");
// const Studentsslc = require("./studentsslc");
// const School = require("./school");

// const PromotedStudent = sequelize.define(
//   "PromotedStudent",
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//       allowNull: false
//     },

//     //  Original student reference
//     studentsslc_id: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },

//     //  Student basic info (snapshot)
//     admissionNumber: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },

//     name: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },

//     fatherName: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },

//     dob: {
//       type: DataTypes.DATE,
//       allowNull: true
//     },

//     gender: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },

//     // Promotion details
//     fromAcademicYear: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },

//     toAcademicYear: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },

//     fromGradeId: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },

//     fromSectionId: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },

//     toGradeId: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },

//     toSectionId: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },

//     // School reference
//     school_id: {
//       type: DataTypes.INTEGER,
//       allowNull: false
//     },

//     // Status
//     status: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       defaultValue: "Promoted"
//     }
//   },
//   {
//     tableName: "PromotedStudents",
//     timestamps: true
//   }
// );

// PromotedStudent.belongsTo(Studentsslc, {
//   foreignKey: "studentsslc_id"
// });

// Studentsslc.hasMany(PromotedStudent, {
//   foreignKey: "studentsslc_id"
// });

// PromotedStudent.belongsTo(School, {
//   foreignKey: "school_id"
// });

// module.exports = PromotedStudent;
