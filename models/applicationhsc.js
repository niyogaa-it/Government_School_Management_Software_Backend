const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");

const Applicationhsc = sequelize.define("Applicationhsc", {
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
    section_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "section",
            key: "id"
        }
    },
    group_subjects: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
    },
    dob: {
        type: DataTypes.DATE,
        allowNull: true
    },
    age: {
        type: DataTypes.STRING,
        allowNull: true
    },
        mobileNumber: {
        type: DataTypes.BIGINT,
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
    birthdistrict: {
        type: DataTypes.STRING,
        allowNull: true
    },
    religion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    community: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    caste: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    scheduledcasteOrtribecommunity: {
        type: DataTypes.STRING,
        allowNull: true
    },
    backwardcaste: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tribeTootherreligion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    living: {
        type: DataTypes.STRING,
        allowNull: true
    },
    currentlivingaddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    motherTongue: {
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
    parentEmail: {
        type: DataTypes.STRING,
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
    academicHistory: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    examYear: {
        type: DataTypes.STRING,
        allowNull: true
    },
    registrationNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tamil: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    english: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    maths: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    science: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    social: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    total: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    percentage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    terminationreason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    photocopyofTC: {
        type: DataTypes.STRING,
        allowNull: true
    },
    previousmedium: {
        type: DataTypes.STRING,
        allowNull: true
    },
    preferredmedium: {
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
        type: DataTypes.STRING,
        allowNull: true
    },
    ifsccode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    feeCollected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true
    },
    feeAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    paymentMode: {
        type: DataTypes.STRING(20),
        allowNull: true   // 'cash' | 'online'
    },
    transactionId: {
        type: DataTypes.STRING(255),  
        allowNull: true
    },
    receiptNumber: {
        type: DataTypes.STRING(150),  
        allowNull: true
    },
    feePaidAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
    studentStatus: {
        field: "studentStatus",
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Applied"
    },
    

}, {
    timestamps: false,
    tableName: "Applicationhsc",
});

Applicationhsc.belongsTo(School, { foreignKey: "school_id" });
Applicationhsc.belongsTo(Grade, { foreignKey: "grade_id" });
Applicationhsc.belongsTo(Section, { foreignKey: "section_id", as: "Section" });

module.exports = Applicationhsc;