const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");
const Group = require("./group");


const Studenthsc = sequelize.define("Studenthsc", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    admissionNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    academicYear: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    dateofjoin: {
        type: DataTypes.DATE,
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
            key: "id",
        },
    },
    group_subjects: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "group",
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
    identificationmarks: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bloodGroup: {
        type: DataTypes.STRING,
        allowNull: true
    },
    motherTongue: {
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
    examYear: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    registrationnumber: {
        type: DataTypes.BIGINT,
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
        field: "preferredmedium",
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
    status: {
        field: "status",
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
    },

}, {
    timestamps: false,
    tableName: "Studenthsc",
});

Studenthsc.belongsTo(School, { foreignKey: "school_id" });
Studenthsc.belongsTo(Grade, { foreignKey: "grade_id" });
Studenthsc.belongsTo(Section, { foreignKey: "section_id", as: "Section" });
Studenthsc.belongsTo(Group, { foreignKey: "group_id" });


module.exports = Studenthsc;