const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");


const Applicationsslc = sequelize.define("Applicationsslc", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  applicationNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "school",
      key: "id",
    },
  },
  emisNum: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  aadharNumber: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true
  },
  grade_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "grade",
      key: "id",
    },
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: true
  },
  age: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  motherTongue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hometown: {
    type: DataTypes.STRING,
    allowNull: true
  },
  religion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  community: {
    type: DataTypes.STRING,
    allowNull: true
  },
  caste: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tribecommunity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  exgratiasalary: {
    type: DataTypes.STRING,
    allowNull: true
  },
  religionchanging: {
    type: DataTypes.STRING,
    allowNull: true
  },
  living: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vaccinated: {
    type: DataTypes.STRING,
    allowNull: true
  },
  identificationmarks: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bloodGroup: {
    type: DataTypes.STRING,
    allowNull: true
  },
  physical: {
    type: DataTypes.STRING,
    allowNull: true
  },
  physicalDetails: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fatherName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  motherName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fatherOccupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  motherOccupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fatherIncome: {
    type: DataTypes.STRING,
    allowNull: true
  },
  motherIncome: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pincode: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  telephoneNumber: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  mobileNumber: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  guardianName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guardianOccupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guardianAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guardianNumber: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  parentconsentform: {
    type: DataTypes.STRING,
    allowNull: true
  },
  academicHistory: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  passorfail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tceslc: {
    type: DataTypes.STRING,
    allowNull: true
  },
  firstLanguage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  branchName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  accountNumber: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  ifsccode: {
    type: DataTypes.STRING,
    allowNull: true
  },

  studentStatus: {
    field: "studentStatus",
    type: DataTypes.STRING, // You can change the type if needed
    allowNull: false,
    defaultValue: "Applied" // Default value for new applications
  },

}, {
  timestamps: false,
  tableName: "Applicationsslc",
});

Applicationsslc.belongsTo(School, { foreignKey: "school_id" });
Applicationsslc.belongsTo(Grade, { foreignKey: "grade_id" });


module.exports = Applicationsslc;