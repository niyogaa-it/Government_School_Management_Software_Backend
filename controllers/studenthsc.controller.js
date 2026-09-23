const { Studenthsc, School, Grade, Section } = require("../models");
const PromotionHistoryHSC = require("../models/promotionhistoryhsc");
const StudentFeeDemand = require("../models/studentfeedemand");
const sequelize = require("../config/database");

const controller = {};
const { Op, Sequelize } = require("sequelize");

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// studentType defaults to "new" on manual creation.
// ─────────────────────────────────────────────────────────────────────────────
controller.createStudenthsc = async (req, res) => {
    let admissionNumber = req.body.admissionNumber;
    try {
        console.log("Request Body:", req.body);
        const {
            school_id,
            academicYear,
            dateofjoin,
            emisNum,
            aadharNumber,
            name,
            gender,
            grade_id,
            group_subjects: formattedSubjects,
            section_id,
            group_id,
            dob,
            age,
            nationality,
            state,
            birthdistrict,
            community,
            caste,
            identificationmarks,
            bloodGroup,
            religion,
            scheduledcasteOrtribecommunity,
            backwardcaste,
            tribeTootherreligion,
            living,
            currentlivingaddress,
            motherTongue,
            fatherName,
            motherName,
            fatherOccupation,
            motherOccupation,
            fatherIncome,
            motherIncome,
            address,
            pincode,
            parentEmail,
            mobileNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            examYear,
            registrationNumber,
            tamil,
            english,
            maths,
            science,
            social,
            total,
            percentage,
            terminationreason,
            photocopyofTC,
            previousmedium,
            preferredmedium,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
            academicHistory,
        } = req.body;

        if (!academicYear || !school_id) {
            return res.status(400).json({ error: "academicYear and school_id are required" });
        }

        const emisExists = await Studenthsc.findOne({ where: { emisNum, school_id } });
        if (emisExists) {
            return res.status(400).json({ error: "EMIS number already exists for this school" });
        }

        const aadharExists = await Studenthsc.findOne({ where: { aadharNumber, school_id } });
        if (aadharExists) {
            return res.status(400).json({ error: "Aadhar number already exists for this school" });
        }

        const school = await School.findByPk(school_id);
        if (!school) return res.status(404).json({ error: "School not found" });

        if (!admissionNumber) {
            const latestAdmission = await Studenthsc.findOne({
                where: { school_id },
                order: [["id", "DESC"]],
                attributes: ["admissionNumber"],
            });

            let nextSequentialNumber = 1;
            let padLength = 4; // default minimum 4 digits
            if (latestAdmission?.admissionNumber) {
                // Match any trailing digits — works for 4, 5, 6, 7... digit numbers
                const match = latestAdmission.admissionNumber.match(/(\d+)$/);
                if (match) {
                    nextSequentialNumber = parseInt(match[1], 10) + 1;
                    // Preserve the digit length of the last number (min 4)
                    padLength = Math.max(4, match[1].length);
                }
            }
            // padStart only pads — never truncates, so 9999+1=10000 grows naturally
            const paddedNumber = String(nextSequentialNumber).padStart(padLength, "0");
            admissionNumber = `${school.shortcode}HSC${paddedNumber}`;
        }

        const count = await Studenthsc.count({ where: { school_id, academicYear } });
        const sequence = String(count + 1).padStart(4, "0");
        const applicationNumber = `${school.shortcode}/APP/${academicYear}/${sequence}`;

        // Normalize academicHistory: parse JSON string → array so Sequelize
        // (DataTypes.JSON column) does not double-encode it.
        
        let normalizedHistory = academicHistory;
        if (typeof normalizedHistory === "string") {
            try {
                normalizedHistory = JSON.parse(normalizedHistory);
                if (typeof normalizedHistory === "string") normalizedHistory = JSON.parse(normalizedHistory);
            } catch (e) {
                console.error("Error parsing academicHistory on create:", e);
                normalizedHistory = [];
            }
        }
        if (!Array.isArray(normalizedHistory)) normalizedHistory = normalizedHistory ? [normalizedHistory] : [];

        // Normalize group_subjects — parse JSON string to array if needed
        let normalizedGroupSubjects = formattedSubjects;
        if (typeof normalizedGroupSubjects === "string") {
            try {
                normalizedGroupSubjects = JSON.parse(normalizedGroupSubjects);
                if (typeof normalizedGroupSubjects === "string") normalizedGroupSubjects = JSON.parse(normalizedGroupSubjects);
            } catch (e) {
                console.error("Error parsing group_subjects on create:", e);
                normalizedGroupSubjects = [];
            }
        }
        if (!Array.isArray(normalizedGroupSubjects)) normalizedGroupSubjects = [];
        normalizedGroupSubjects = normalizedGroupSubjects.map(String);

        const newStudenthsc = await Studenthsc.create({
            admissionNumber,
            school_id,
            academicYear,
            dateofjoin,
            applicationNumber,
            emisNum,
            aadharNumber,
            name,
            gender,
            grade_id,
            section_id,
            group_id,
            group_subjects: normalizedGroupSubjects,
            dob,
            age,
            nationality,
            state,
            birthdistrict,
            community,
            caste,
            identificationmarks,
            bloodGroup,
            religion,
            scheduledcasteOrtribecommunity,
            backwardcaste,
            tribeTootherreligion,
            living,
            currentlivingaddress,
            motherTongue,
            fatherName,
            motherName,
            fatherOccupation,
            motherOccupation,
            fatherIncome,
            motherIncome,
            address,
            pincode,
            parentEmail,
            mobileNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            examYear,
            registrationNumber,
            tamil,
            english,
            maths,
            science,
            social,
            total,
            percentage,
            terminationreason,
            photocopyofTC,
            previousmedium,
            preferredmedium,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
            academicHistory: normalizedHistory,
            studentType: "new",   // ← always "new" on direct creation
            status: "active",
        });

        return res.status(201).json({
            message: "Application created successfully",
            application: newStudenthsc,
        });
    } catch (error) {
        console.error("Error creating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL  (superadmin — all schools, all statuses except Removed)
// FIX: was filtering status="active" only → missed promoted/demoted/TC students
// ORDER BY id DESC (table has no createdAt column)
// ─────────────────────────────────────────────────────────────────────────────
controller.getAllStudenthsc = async (req, res) => {
    try {
        const studenthscs = await Studenthsc.findAll({
            where: {
                status: { [Op.ne]: "Removed" },
            },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
            order: [["id", "DESC"]],
        });
        return res.json({ studenthscs });
    } catch (error) {
        console.error("Error fetching studenthscs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL BY YEAR — ALL SCHOOLS  (superadmin)
// Mirrors getStudenthscsBySchoolAndYear but without school_id filter.
// Shows promoted/demoted students with correct isLocked flags.
//
// CASE A: promoted OUT of this year   → show with snapshot grade/section, LOCKED
// CASE B: demoted  OUT of this year   → show with snapshot grade/section, LOCKED
// CASE C: currently lives in this year → show live data, UNLOCKED
// ─────────────────────────────────────────────────────────────────────────────
controller.getAllStudenthscByYear = async (req, res) => {
    try {
        const { year } = req.params;

        // 1. All non-removed students across ALL schools
        const allStudents = await Studenthsc.findAll({
            where: {
                status: { [Op.ne]: "Removed" },
            },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });

        // 2. Promotion snapshots for this year (all schools)
        const promotionSnapshots = await PromotionHistoryHSC.findAll({
            where: { fromAcademicYear: year, type: "promotion" },
            include: [
                { model: Grade, as: "FromGrade", attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        // 3. Demotion snapshots for this year (all schools)
        const demotionSnapshots = await PromotionHistoryHSC.findAll({
            where: { fromAcademicYear: year, type: "demotion" },
            include: [
                { model: Grade, as: "FromGrade", attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        const promotionMap = {};
        const demotionMap = {};
        for (const snap of promotionSnapshots) promotionMap[snap.student_id] = snap;
        for (const snap of demotionSnapshots) demotionMap[snap.student_id] = snap;

        const result = [];

        for (const student of allStudents) {
            const promSnap = promotionMap[student.id];
            const demSnap = demotionMap[student.id];

            if (promSnap) {
                // CASE A: Promoted OUT of this year → show with from-snapshot, LOCKED
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id: promSnap.from_grade_id,
                    section_id: promSnap.from_section_id,
                    Grade: { id: promSnap.from_grade_id, grade: promSnap.FromGrade?.grade || "N/A" },
                    Section: { id: promSnap.from_section_id, sectionName: promSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: true,
                    isDemoted: false,
                    isLocked: true,
                });
            } else if (demSnap) {
                // CASE B: Demoted OUT of this year → show with from-snapshot, LOCKED
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id: demSnap.from_grade_id,
                    section_id: demSnap.from_section_id,
                    Grade: { id: demSnap.from_grade_id, grade: demSnap.FromGrade?.grade || "N/A" },
                    Section: { id: demSnap.from_section_id, sectionName: demSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: false,
                    isDemoted: true,
                    isLocked: true,
                });
            } else if (student.academicYear === year) {
                // CASE C: Student currently lives in this year → UNLOCKED
                result.push({
                    ...student.toJSON(),
                    isPromoted: false,
                    isDemoted: false,
                    isLocked: false,
                });
            }
            // Different year, no snapshot → skip
        }

        return res.status(200).json({ studenthscs: result });
    } catch (error) {
        console.error("Error fetching studenthscs by year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudenthscsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID required" });

        const studenthscs = await Studenthsc.findAll({
            where: {
                school_id,
                status: { [Op.notIn]: ["Removed", "Withdrawn", "TC Issued"] },
            },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
            order: [["id", "DESC"]],
        });
        return res.json({ studenthscs });
    } catch (error) {
        console.error("Error fetching HSC students by school:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY SCHOOL + YEAR  (with promotion AND demotion snapshot support)
//
// Shows ALL students who belong to the filtered year — including promoted,
// demoted, TC Issued, and Withdrawn — with correct lock/unlock flags.
//
// LOCK / UNLOCK TRUTH TABLE
// ─────────────────────────────────────────────────────────────────────────────
// Action                       │ Filter 2025-26           │ Filter 2026-27
// ─────────────────────────────┼──────────────────────────┼────────────────────
// Promote 2025-26 → 2026-27    │ LOCKED  (promSnap found) │ UNLOCKED (CASE C)
// Demote  2026-27 → 2025-26    │ UNLOCKED (CASE C)        │ LOCKED  (demSnap)
// Re-promote 2025-26 → 2026-27 │ LOCKED  (promSnap found) │ UNLOCKED (CASE C)✅
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudenthscsBySchoolAndYear = async (req, res) => {
    try {
        const { school_id, year } = req.params;

        // 1. All students for this school (any year) except hard-deleted
        const allStudents = await Studenthsc.findAll({
            where: {
                school_id,
                status: { [Op.ne]: "Removed" },
            },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });

        // 2. Promotion snapshots for this school + year
        const promotionSnapshots = await PromotionHistoryHSC.findAll({
            where: { school_id, fromAcademicYear: year, type: "promotion" },
            include: [
                { model: Grade, as: "FromGrade", attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        // 3. Demotion snapshots for this school + year
        const demotionSnapshots = await PromotionHistoryHSC.findAll({
            where: { school_id, fromAcademicYear: year, type: "demotion" },
            include: [
                { model: Grade, as: "FromGrade", attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        const promotionMap = {};
        const demotionMap = {};
        for (const snap of promotionSnapshots) promotionMap[snap.student_id] = snap;
        for (const snap of demotionSnapshots) demotionMap[snap.student_id] = snap;

        const result = [];

        for (const student of allStudents) {
            const promSnap = promotionMap[student.id];
            const demSnap = demotionMap[student.id];

            if (promSnap) {
                // CASE A: Promoted OUT of this year → show with from-snapshot, LOCKED
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id: promSnap.from_grade_id,
                    section_id: promSnap.from_section_id,
                    Grade: { id: promSnap.from_grade_id, grade: promSnap.FromGrade?.grade || "N/A" },
                    Section: { id: promSnap.from_section_id, sectionName: promSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: true,
                    isDemoted: false,
                    isLocked: true,
                });
            } else if (demSnap) {
                // CASE B: Demoted OUT of this year → show with from-snapshot, LOCKED
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id: demSnap.from_grade_id,
                    section_id: demSnap.from_section_id,
                    Grade: { id: demSnap.from_grade_id, grade: demSnap.FromGrade?.grade || "N/A" },
                    Section: { id: demSnap.from_section_id, sectionName: demSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: false,
                    isDemoted: true,
                    isLocked: true,
                });
            } else if (student.academicYear === year) {
                // CASE C: Student currently lives in this year → UNLOCKED
                result.push({
                    ...student.toJSON(),
                    isPromoted: false,
                    isDemoted: false,
                    isLocked: false,
                });
            }
            // Different year, no snapshot → skip
        }

        return res.status(200).json({ studenthscs: result });
    } catch (error) {
        console.error("Error fetching HSC students by school and year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudenthscById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Studenthsc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });
        if (!student) return res.status(404).json({ error: "Student not found" });
        return res.json({ student });
    } catch (error) {
        console.error("Error fetching student by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudenthscByAdmission = async (req, res) => {
    try {
        const { admissionNumber } = req.params;
        const student = await Studenthsc.findOne({
            where: { admissionNumber },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });
        if (!student) return res.status(404).json({ error: "Student not found" });
        return res.json({ student });
    } catch (error) {
        console.error("Error fetching student by admission number:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudentsByGradeYear = async (req, res) => {
    try {
        const { school_id, grade_id, academicYear } = req.query;
        if (!school_id || !grade_id || !academicYear) {
            return res.status(400).json({ error: "school_id, grade_id, and academicYear are required" });
        }
        const students = await Studenthsc.findAll({
            where: { school_id, grade_id, academicYear, status: "active" },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });
        return res.status(200).json({ students });
    } catch (error) {
        console.error("Error fetching HSC students by grade and year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudentsByFilter = async (req, res) => {
    try {
        const { school_id, grade_id, section_id, academicYear } = req.query;
        const where = { status: { [Op.notIn]: ["Removed"] } };
        if (school_id) where.school_id = school_id;
        if (grade_id) where.grade_id = grade_id;
        if (section_id) where.section_id = section_id;
        if (academicYear) where.academicYear = academicYear;
        const students = await Studenthsc.findAll({
            where,
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });
        return res.status(200).json({ students });
    } catch (error) {
        console.error("Error fetching HSC students by filter:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STATUS — no body needed, always sets "Removed"
// ─────────────────────────────────────────────────────────────────────────────
controller.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Studenthsc.findByPk(id);
        if (!student) return res.status(404).json({ error: "Application not found" });
        await student.update({ status: "Removed" });
        res.json({ message: "Application removed successfully" });
    } catch (error) {
        console.error("Error removing application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE STUDENT  (soft-delete — sets status = "Removed")
// ─────────────────────────────────────────────────────────────────────────────
controller.deleteStudenthsc = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Studenthsc.findByPk(id);
        if (!student) return res.status(404).json({ error: "Student not found" });
        if (student.status === "Removed") return res.status(400).json({ error: "Student is already removed" });
        await student.update({ status: "Removed" });
        return res.status(200).json({ message: "Application removed successfully" });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STUDENT (full update)
// ─────────────────────────────────────────────────────────────────────────────
controller.updateStudenthsc = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Studenthsc.findByPk(id);
        if (!student) return res.status(404).json({ error: "Student not found" });

        const updatedData = { ...req.body };

        // Normalize academicHistory
        if (updatedData.academicHistory !== undefined) {
            let ah = updatedData.academicHistory;
            if (typeof ah === "string") {
                try {
                    ah = JSON.parse(ah);
                    if (typeof ah === "string") ah = JSON.parse(ah);
                } catch (e) {
                    console.error("Error parsing academicHistory on update:", e);
                    ah = [];
                }
            }
            updatedData.academicHistory = Array.isArray(ah) ? ah : (ah ? [ah] : []);
        }

        // Normalize group_subjects — same problem: JSON column must receive a plain array,
        // not a JSON string. Parse it if the frontend sent it as a string.
        if (updatedData.group_subjects !== undefined) {
            let gs = updatedData.group_subjects;
            if (typeof gs === "string") {
                try {
                    gs = JSON.parse(gs);
                    if (typeof gs === "string") gs = JSON.parse(gs);
                } catch (e) {
                    console.error("Error parsing group_subjects on update:", e);
                    gs = [];
                }
            }
            // Normalize all IDs to strings for consistency
            updatedData.group_subjects = Array.isArray(gs) ? gs.map(String) : [];
        }

        await student.update(updatedData);
        return res.json({ message: "Student updated successfully", student });
    } catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW STUDENTS (bulk)
// Checks fee dues BEFORE allowing the withdrawal.
// ─────────────────────────────────────────────────────────────────────────────
controller.withdrawStudents = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentIds, reason, school_id, academic_year } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "studentIds array is required" });
        }
        if (!school_id) {
            await transaction.rollback();
            return res.status(400).json({ error: "school_id is required" });
        }

        // ── Fee Due Check ─────────────────────────────────────────────────────
        // Fetch all selected students to get their admission numbers and names
        const selectedStudents = await Studenthsc.findAll({
            where: { id: studentIds },
            attributes: ["id", "name", "admissionNumber", "academicYear"],
            transaction,
        });

        // Use passed academic_year or fall back to each student's own academicYear
        const studentsWithDues = [];
        for (const student of selectedStudents) {
            const yearToCheck = academic_year || student.academicYear;
            if (!yearToCheck) continue;

            // Find any demand rows for this student that still have an outstanding balance
            const unpaidDemands = await StudentFeeDemand.findAll({
                where: {
                    school_id,
                    academic_year: yearToCheck,
                    admission_number: student.admissionNumber,
                    status: { [Op.in]: ["Unpaid", "Partial"] },
                },
                attributes: ["id", "total_amount", "paid_amount", "balance_amount", "status", "fee_items"],
            });

            if (unpaidDemands.length > 0) {
                // Sum up the total outstanding balance across all unpaid/partial demands
                const totalBalance = unpaidDemands.reduce((sum, d) => {
                    const bal = parseFloat(d.balance_amount ?? (d.total_amount - d.paid_amount)) || 0;
                    return sum + bal;
                }, 0);

                // Collect the fee types that are still pending for clearer error messaging
                const pendingFeeTypes = [];
                unpaidDemands.forEach((d) => {
                    let items = d.fee_items || [];
                    if (typeof items === "string") {
                        try { items = JSON.parse(items); } catch { items = []; }
                    }
                    if (Array.isArray(items)) {
                        items.forEach((f) => {
                            if (f.type) pendingFeeTypes.push(f.type);
                        });
                    }
                });

                studentsWithDues.push({
                    id: student.id,
                    name: student.name,
                    admissionNumber: student.admissionNumber,
                    academicYear: yearToCheck,
                    balance_amount: parseFloat(totalBalance.toFixed(2)),
                    pendingFeeTypes: [...new Set(pendingFeeTypes)],  // de-duplicate
                    demandCount: unpaidDemands.length,
                });
            }
        }

        // Block the TC if ANY selected student still has pending dues
        if (studentsWithDues.length > 0) {
            await transaction.rollback();
            const names = studentsWithDues.map((s) => `${s.name} (₹${s.balance_amount})`).join(", ");
            return res.status(400).json({
                error: `Cannot issue TC. The following student(s) have pending fee dues: ${names}. Please clear all dues before issuing TC.`,
                studentsWithDues,
                hasDues: true,
            });
        }
        // ── /Fee Due Check ────────────────────────────────────────────────────

        await Studenthsc.update(
            { status: "Withdrawn", terminationreason: reason || null },
            { where: { id: studentIds }, transaction }
        );

        await transaction.commit();
        return res.json({ message: `${studentIds.length} student(s) withdrawn successfully` });
    } catch (error) {
        await transaction.rollback();
        console.error("Error withdrawing students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TC STUDENTS (all schools)
// ─────────────────────────────────────────────────────────────────────────────
controller.getTCStudents = async (req, res) => {
    try {
        const students = await Studenthsc.findAll({
            where: { status: "TC Issued" },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
            order: [["id", "DESC"]],
        });
        return res.json({ students });
    } catch (error) {
        console.error("Error fetching TC students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TC STUDENTS BY SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
controller.getTCStudentsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        const students = await Studenthsc.findAll({
            where: { school_id, status: "TC Issued" },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
            order: [["id", "DESC"]],
        });
        return res.json({ students });
    } catch (error) {
        console.error("Error fetching TC students by school:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROMOTION HISTORY BY SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
controller.getPromotionHistory = async (req, res) => {
    try {
        const { school_id } = req.params;
        const history = await PromotionHistoryHSC.findAll({
            where: { school_id },
            include: [
                { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, as: "FromGrade", attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
                { model: Grade, as: "ToGrade", attributes: ["id", "grade"] },
                { model: Section, as: "ToSection", attributes: ["id", "sectionName"] },
            ],
            order: [["dateOfPromotion", "DESC"]],
        });
        return res.status(200).json({ history });
    } catch (error) {
        console.error("Error fetching HSC promotion history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTE HSC STUDENTS
//
//   1. promote 2025-26 → 2026-27
//        deletes: demotion(from=2026-27) if exists  ← clears stale lock
//        writes:  promotion(from=2025-26)            → 2025-26 LOCKED
//        student: academicYear=2026-27, studentType="old"  → 2026-27 UNLOCKED
//
//   2. demote 2026-27 → 2025-26
//        deletes: promotion(from=2025-26)            → 2025-26 UNLOCKED
//        writes:  demotion(from=2026-27)             → 2026-27 LOCKED
//        student: academicYear=2025-26, studentType="old"
//
//   3. RE-PROMOTE 2025-26 → 2026-27
//        deletes: demotion(from=2026-27)  ✅         → 2026-27 stale lock cleared
//        writes:  promotion(from=2025-26)            → 2025-26 LOCKED
//        student: academicYear=2026-27, studentType="old"  → 2026-27 UNLOCKED ✅
// ─────────────────────────────────────────────────────────────────────────────
controller.promoteStudents = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentIds, toAcademicYear, toGradeId, toSectionId, toGroupSubjectIds } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: "studentIds array is required" });
        }
        if (!toAcademicYear) return res.status(400).json({ error: "toAcademicYear is required" });
        if (!toGradeId) return res.status(400).json({ error: "toGradeId is required" });
        if (!toSectionId) return res.status(400).json({ error: "toSectionId is required" });

        const students = await Studenthsc.findAll({
            where: { id: studentIds, status: "active" },
            transaction,
        });

        if (students.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "No active students found for the given IDs" });
        }

        // Guard: block already promoted students from their current year
        const alreadyPromoted = [];
        for (const student of students) {
            const existing = await PromotionHistoryHSC.findOne({
                where: { student_id: student.id, fromAcademicYear: student.academicYear, type: "promotion" },
                transaction,
            });
            if (existing) alreadyPromoted.push(student.name);
        }
        if (alreadyPromoted.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                error: `The following student(s) are already promoted for their current academic year: ${alreadyPromoted.join(", ")}`,
            });
        }

        const dateOfPromotion = new Date();

        // STEP 1: Delete any stale DEMOTION record for the target year
        for (const student of students) {
            await PromotionHistoryHSC.destroy({
                where: { student_id: student.id, fromAcademicYear: toAcademicYear, type: "demotion" },
                transaction,
            });
        }

        // STEP 2: Write PROMOTION history snapshot
        const historyRows = students.map((student) => ({
            student_id: student.id,
            admissionNumber: student.admissionNumber,
            studentName: student.name,
            fromAcademicYear: student.academicYear,
            from_grade_id: student.grade_id,
            from_section_id: student.section_id,
            toAcademicYear,
            to_grade_id: toGradeId,
            to_section_id: toSectionId,
            school_id: student.school_id,
            dateOfPromotion,
            type: "promotion",
        }));
        await PromotionHistoryHSC.bulkCreate(historyRows, { transaction });

        // STEP 3: Move student to the new year — mark studentType as "old"
        // If toGroupSubjectIds is provided, update group_subjects as well
        const groupSubjects = Array.isArray(toGroupSubjectIds) && toGroupSubjectIds.length > 0
            ? toGroupSubjectIds.map(String)
            : undefined;

        const updates = students.map((student) => {
            const fields = {
                academicYear: toAcademicYear,
                grade_id: toGradeId,
                section_id: toSectionId,
                status: "active",
                studentType: "old",
            };
            if (groupSubjects) fields.group_subjects = groupSubjects;
            return student.update(fields, { transaction });
        });
        await Promise.all(updates);

        await transaction.commit();
        return res.status(200).json({
            message: `${students.length} student(s) promoted successfully`,
            promoted: students.length,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error promoting HSC students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEMOTE HSC STUDENTS
// studentType is also set to "old" on demotion (student has moved year at least once).
// ─────────────────────────────────────────────────────────────────────────────
controller.demoteStudents = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentIds, toAcademicYear, toGradeId, toSectionId, toGroupSubjectIds } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: "studentIds array is required" });
        }
        if (!toAcademicYear) return res.status(400).json({ error: "toAcademicYear is required" });
        if (!toGradeId) return res.status(400).json({ error: "toGradeId is required" });
        if (!toSectionId) return res.status(400).json({ error: "toSectionId is required" });

        const students = await Studenthsc.findAll({
            where: { id: studentIds, status: { [Op.notIn]: ["Removed", "TC Issued"] } },
            transaction,
        });

        if (students.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "No eligible students found for the given IDs" });
        }

        // Guard: block double-demotion from the same year
        const alreadyDemoted = [];
        for (const student of students) {
            const existing = await PromotionHistoryHSC.findOne({
                where: { student_id: student.id, fromAcademicYear: student.academicYear, type: "demotion" },
                transaction,
            });
            if (existing) alreadyDemoted.push(student.name);
        }
        if (alreadyDemoted.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                error: `The following student(s) have already been demoted for their current academic year: ${alreadyDemoted.join(", ")}`,
            });
        }

        const dateOfPromotion = new Date();

        // STEP 1: Delete the original PROMOTION record (unlocks toAcademicYear)
        for (const student of students) {
            await PromotionHistoryHSC.destroy({
                where: { student_id: student.id, fromAcademicYear: toAcademicYear, type: "promotion" },
                transaction,
            });
        }

        // STEP 2: Record DEMOTION history snapshot (locks current year)
        const historyRows = students.map((student) => ({
            student_id: student.id,
            admissionNumber: student.admissionNumber,
            studentName: student.name,
            fromAcademicYear: student.academicYear,
            from_grade_id: student.grade_id,
            from_section_id: student.section_id,
            toAcademicYear,
            to_grade_id: toGradeId,
            to_section_id: toSectionId,
            school_id: student.school_id,
            dateOfPromotion,
            type: "demotion",
        }));
        await PromotionHistoryHSC.bulkCreate(historyRows, { transaction });

        // STEP 3: Move student back to previous year — mark studentType as "old"
        // If toGroupSubjectIds is provided, update group_subjects as well
        const groupSubjects = Array.isArray(toGroupSubjectIds) && toGroupSubjectIds.length > 0
            ? toGroupSubjectIds.map(String)
            : undefined;

        const updates = students.map((student) => {
            const fields = {
                academicYear: toAcademicYear,
                grade_id: toGradeId,
                section_id: toSectionId,
                status: "active",
                studentType: "old",
            };
            if (groupSubjects) fields.group_subjects = groupSubjects;
            return student.update(fields, { transaction });
        });
        await Promise.all(updates);

        await transaction.commit();
        return res.status(200).json({
            message: `${students.length} student(s) demoted successfully`,
            demoted: students.length,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error demoting HSC students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHECK FEE DUES BEFORE TC  (HSC)
// POST /studenthsc/checkFeeDuesBeforeTc
// Body: { studentIds: [1,2,...], academic_year: "2024-25", school_id: 1 }
// Returns: { hasDues: true/false, studentsWithDues: [...] }
// ─────────────────────────────────────────────────────────────────────────────
controller.checkFeeDuesBeforeTc = async (req, res) => {
    try {
        const { studentIds, academic_year, school_id } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: "studentIds array is required" });
        }
        if (!school_id) {
            return res.status(400).json({ error: "school_id is required" });
        }

        // Fetch all selected students so we have their name, admissionNumber and academicYear
        const students = await Studenthsc.findAll({
            where: { id: studentIds },
            attributes: ["id", "name", "admissionNumber", "academicYear"],
        });

        if (students.length === 0) {
            return res.status(404).json({ error: "No students found for the provided IDs" });
        }

        const studentsWithDues = [];

        for (const student of students) {
            // Use caller-supplied academic_year; fall back to the student's own year
            const yearToCheck = academic_year || student.academicYear;
            if (!yearToCheck) continue;

            // Find every fee demand for this student that is still unpaid or partially paid
            const unpaidDemands = await StudentFeeDemand.findAll({
                where: {
                    school_id,
                    academic_year: yearToCheck,
                    admission_number: student.admissionNumber,
                    status: { [Op.in]: ["Unpaid", "Partial"] },
                },
                attributes: ["id", "total_amount", "paid_amount", "balance_amount", "status", "fee_items"],
            });

            if (unpaidDemands.length === 0) continue;

            // Calculate the aggregate outstanding balance
            const totalBalance = unpaidDemands.reduce((sum, d) => {
                const bal = parseFloat(d.balance_amount ?? (d.total_amount - d.paid_amount)) || 0;
                return sum + bal;
            }, 0);

            // Collect distinct pending fee-type names for a human-readable message
            const pendingFeeTypes = [];
            unpaidDemands.forEach((d) => {
                let items = d.fee_items || [];
                if (typeof items === "string") {
                    try { items = JSON.parse(items); } catch { items = []; }
                }
                if (Array.isArray(items)) {
                    items.forEach((f) => { if (f.type) pendingFeeTypes.push(f.type); });
                }
            });

            studentsWithDues.push({
                id: student.id,
                name: student.name,
                admissionNumber: student.admissionNumber,
                academicYear: yearToCheck,
                balance_amount: parseFloat(totalBalance.toFixed(2)),
                pendingFeeTypes: [...new Set(pendingFeeTypes)],
                demandCount: unpaidDemands.length,
            });
        }

        if (studentsWithDues.length > 0) {
            return res.status(200).json({
                hasDues: true,
                studentsWithDues,
                message: `${studentsWithDues.length} student(s) have pending fee dues.`,
            });
        }

        return res.status(200).json({
            hasDues: false,
            studentsWithDues: [],
            message: "No pending fee dues. TC can be issued.",
        });
    } catch (error) {
        console.error("Error checking fee dues before TC (HSC):", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getActiveStudenthscCount = async (req, res) => {
    try {
        const { schoolId, year } = req.query;

        const where = {
            status: "active",
        };

        if (schoolId) where.school_id = schoolId;
        if (year) where.academicYear = year;

        const count = await Studenthsc.count({ where });

        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch HSC count" });
    }
};

module.exports = controller;