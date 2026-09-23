
// controllers/bulkupload.controller.js
const { Studenthsc, Studentsslc, School } = require("../models");
const XLSX = require("xlsx");

const controller = {};

// ─── Helper: parse age from "17y 1m 5d" or separate year/month/day columns ────
const parseAgeString = (str) => {
    if (!str) return null;
    if (typeof str === "object") return str; // already JSON
    const match = String(str).match(/(\d+)y\s*(\d+)m\s*(\d+)d/);
    if (match) return { years: +match[1], months: +match[2], days: +match[3] };
    return str;
};

// ─── Helper: generate admission number ────────────────────────────────────────
const generateAdmissionNumber = async (Model, school, type, academicYear) => {
    const latest = await Model.findOne({
        where: { school_id: school.id, academicYear },
        order: [["id", "DESC"]],
        attributes: ["admissionNumber"],
    });
    let next = 1;
    if (latest?.admissionNumber) {
        const m = latest.admissionNumber.match(/(\d{4})$/);
        if (m) next = parseInt(m[1], 10) + 1;
    }
    return `${school.shortcode}${type}${String(next).padStart(4, "0")}`;
};

// ─── Helper: generate application number ──────────────────────────────────────
const generateApplicationNumber = async (Model, school, academicYear) => {
    const count = await Model.count({ where: { school_id: school.id, academicYear } });
    return `${school.shortcode}/APP/${academicYear}/${String(count + 1).padStart(4, "0")}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /bulkupload/hsc
// ═══════════════════════════════════════════════════════════════════════════════
controller.bulkUploadHSC = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

        if (!rows.length) return res.status(400).json({ error: "Excel file is empty" });

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // excel row (header=1)

            try {
                const { school_id, academicYear, name } = row;

                if (!school_id || !academicYear || !name) {
                    results.failed++;
                    results.errors.push({ row: rowNum, error: "Missing required fields: school_id, academicYear, name" });
                    continue;
                }

                const school = await School.findByPk(school_id);
                if (!school) {
                    results.failed++;
                    results.errors.push({ row: rowNum, error: `School id ${school_id} not found` });
                    continue;
                }

                // Duplicate checks
                if (row.emisNum) {
                    const emisExists = await Studenthsc.findOne({ where: { emisNum: row.emisNum, school_id } });
                    if (emisExists) {
                        results.failed++;
                        results.errors.push({ row: rowNum, name, error: `EMIS number ${row.emisNum} already exists` });
                        continue;
                    }
                }
                if (row.aadharNumber) {
                    const aadharExists = await Studenthsc.findOne({ where: { aadharNumber: row.aadharNumber, school_id } });
                    if (aadharExists) {
                        results.failed++;
                        results.errors.push({ row: rowNum, name, error: `Aadhar number ${row.aadharNumber} already exists` });
                        continue;
                    }
                }

                const admissionNumber = await generateAdmissionNumber(Studenthsc, school, "HSC", String(academicYear));
                const applicationNumber = await generateApplicationNumber(Studenthsc, school, String(academicYear));

                // Format group_subjects
                let group_subjects = row.group_subjects || null;
                if (Array.isArray(group_subjects)) group_subjects = group_subjects.join(",");

                await Studenthsc.create({
                    admissionNumber,
                    applicationNumber,
                    school_id: +school_id,
                    academicYear: String(academicYear),
                    dateofjoin: row.dateofjoin || null,
                    emisNum: row.emisNum || null,
                    aadharNumber: row.aadharNumber || null,
                    name: row.name || null,
                    gender: row.gender || null,
                    grade_id: row.grade_id || null,
                    section_id: row.section_id || null,
                    group_id: row.group_id || null,
                    group_subjects,
                    dob: row.dob || null,
                    age: row.age || null,
                    nationality: row.nationality || null,
                    state: row.state || null,
                    birthdistrict: row.birthdistrict || null,
                    community: row.community || null,
                    caste: row.caste || null,
                    identificationmarks: row.identificationmarks || null,
                    bloodGroup: row.bloodGroup || null,
                    religion: row.religion || null,
                    scheduledcasteOrtribecommunity: row.scheduledcasteOrtribecommunity || null,
                    backwardcaste: row.backwardcaste || null,
                    tribeTootherreligion: row.tribeTootherreligion || null,
                    living: row.living || null,
                    currentlivingaddress: row.currentlivingaddress || null,
                    motherTongue: row.motherTongue || null,
                    fatherName: row.fatherName || null,
                    motherName: row.motherName || null,
                    fatherOccupation: row.fatherOccupation || null,
                    motherOccupation: row.motherOccupation || null,
                    fatherIncome: row.fatherIncome || null,
                    motherIncome: row.motherIncome || null,
                    address: row.address || null,
                    pincode: row.pincode || null,
                    telephoneNumber: row.telephoneNumber || null,
                    mobileNumber: row.mobileNumber || null,
                    guardianName: row.guardianName || null,
                    guardianOccupation: row.guardianOccupation || null,
                    guardianAddress: row.guardianAddress || null,
                    guardianNumber: row.guardianNumber || null,
                    examYear: row.examYear || null,
                    registrationnumber: row.registrationnumber || null,
                    tamil: row.tamil || null,
                    english: row.english || null,
                    maths: row.maths || null,
                    science: row.science || null,
                    social: row.social || null,
                    total: row.total || null,
                    percentage: row.percentage ? String(row.percentage) : null,
                    terminationreason: row.terminationreason || null,
                    photocopyofTC: row.photocopyofTC || null,
                    previousmedium: row.previousmedium || null,
                    preferredmedium: row.preferredmedium || null,
                    bankName: row.bankName || null,
                    branchName: row.branchName || null,
                    accountNumber: row.accountNumber || null,
                    ifsccode: row.ifsccode || null,
                    status: "active",
                });

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ row: rowNum, name: row.name || "Unknown", error: err.message });
            }
        }

        return res.status(200).json({
            message: `HSC Bulk Upload complete. ${results.success} inserted, ${results.failed} failed.`,
            ...results,
        });
    } catch (error) {
        console.error("HSC Bulk Upload Error:", error);
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /bulkupload/sslc
// ═══════════════════════════════════════════════════════════════════════════════
controller.bulkUploadSSLC = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

        if (!rows.length) return res.status(400).json({ error: "Excel file is empty" });

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            try {
                const { school_id, academicYear, name } = row;

                if (!school_id || !academicYear || !name) {
                    results.failed++;
                    results.errors.push({ row: rowNum, error: "Missing required fields: school_id, academicYear, name" });
                    continue;
                }

                const school = await School.findByPk(school_id);
                if (!school) {
                    results.failed++;
                    results.errors.push({ row: rowNum, error: `School id ${school_id} not found` });
                    continue;
                }

                if (row.emisNum) {
                    const emisExists = await Studentsslc.findOne({ where: { emisNum: row.emisNum, school_id } });
                    if (emisExists) {
                        results.failed++;
                        results.errors.push({ row: rowNum, name, error: `EMIS number ${row.emisNum} already exists` });
                        continue;
                    }
                }
                if (row.aadharNumber) {
                    const aadharExists = await Studentsslc.findOne({ where: { aadharNumber: row.aadharNumber, school_id } });
                    if (aadharExists) {
                        results.failed++;
                        results.errors.push({ row: rowNum, name, error: `Aadhar number ${row.aadharNumber} already exists` });
                        continue;
                    }
                }

                const admissionNumber = await generateAdmissionNumber(Studentsslc, school, "SSLC", String(academicYear));
                const applicationNumber = await generateApplicationNumber(Studentsslc, school, String(academicYear));

                // Build age JSON from separate columns or combined string
                let age = null;
                if (row.age_years != null || row.age_months != null || row.age_days != null) {
                    age = {
                        years: row.age_years || 0,
                        months: row.age_months || 0,
                        days: row.age_days || 0,
                    };
                } else if (row.age) {
                    age = parseAgeString(row.age);
                }

                // academicHistory: if provided as JSON string
                let academicHistory = row.academicHistory || null;
                if (typeof academicHistory === "string") {
                    try { academicHistory = JSON.parse(academicHistory); } catch (_) { academicHistory = null; }
                }

                await Studentsslc.create({
                    admissionNumber,
                    applicationNumber,
                    school_id: +school_id,
                    academicYear: String(academicYear),
                    dateofjoin: row.dateofjoin || null,
                    emisNum: row.emisNum || null,
                    aadharNumber: row.aadharNumber || null,
                    name: row.name || null,
                    gender: row.gender || null,
                    grade_id: row.grade_id || null,
                    section_id: row.section_id || null,
                    dob: row.dob || null,
                    age,
                    nationality: row.nationality || null,
                    state: row.state || null,
                    motherTongue: row.motherTongue || null,
                    hometown: row.hometown || null,
                    religion: row.religion || null,
                    community: row.community || null,
                    caste: row.caste || null,
                    tribecommunity: row.tribecommunity || null,
                    exgratiasalary: row.exgratiasalary || null,
                    religionchanging: row.religionchanging || null,
                    living: row.living || null,
                    vaccinated: row.vaccinated || null,
                    identificationmarks: row.identificationmarks || null,
                    bloodGroup: row.bloodGroup || null,
                    physical: row.physical || null,
                    physicalDetails: row.physicalDetails || null,
                    fatherName: row.fatherName || null,
                    motherName: row.motherName || null,
                    fatherOccupation: row.fatherOccupation || null,
                    motherOccupation: row.motherOccupation || null,
                    fatherIncome: row.fatherIncome || null,
                    motherIncome: row.motherIncome || null,
                    address: row.address || null,
                    pincode: row.pincode || null,
                    telephoneNumber: row.telephoneNumber || null,
                    mobileNumber: row.mobileNumber || null,
                    guardianName: row.guardianName || null,
                    guardianOccupation: row.guardianOccupation || null,
                    guardianAddress: row.guardianAddress || null,
                    guardianNumber: row.guardianNumber || null,
                    academicHistory,
                    parentconsentform: row.parentconsentform || null,
                    passorfail: row.passorfail || null,
                    tceslc: row.tceslc || null,
                    firstLanguage: row.firstLanguage || null,
                    bankName: row.bankName || null,
                    branchName: row.branchName || null,
                    accountNumber: row.accountNumber || null,
                    ifsccode: row.ifsccode || null,
                    status: "active",
                });

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ row: rowNum, name: row.name || "Unknown", error: err.message });
            }
        }

        return res.status(200).json({
            message: `SSLC Bulk Upload complete. ${results.success} inserted, ${results.failed} failed.`,
            ...results,
        });
    } catch (error) {
        console.error("SSLC Bulk Upload Error:", error);
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

module.exports = controller;
