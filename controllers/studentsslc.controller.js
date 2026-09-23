const { Studentsslc, School, Grade, Section } = require("../models");
const PromotionHistory = require("../models/promotionhistory");
const StudentFeeDemand = require("../models/studentfeedemand");
const sequelize = require("../config/database");

const controller = {};
const { Op, Sequelize } = require("sequelize");

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
controller.createStudentsslc = async (req, res) => {
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
            section_id,
            dob,
            age,
            medium,
            nationality,
            state,
            motherTongue,
            religion,
            hometown,
            community,
            caste,
            tribecommunity,
            exgratiasalary,
            religionchanging,
            living,
            vaccinated,
            identificationmarks,
            bloodGroup,
            physical,
            physicalDetails,
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
            academicHistory,
            parentconsentform,
            passorfail,
            tceslc,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
        } = req.body;

        if (!academicYear || !school_id) {
            return res.status(400).json({ error: "academicYear and school_id are required" });
        }

        const emisExists = await Studentsslc.findOne({ where: { emisNum, school_id } });
        if (emisExists) {
            return res.status(400).json({ error: "EMIS number already exists for this school" });
        }

        const aadharExists = await Studentsslc.findOne({ where: { aadharNumber, school_id } });
        if (aadharExists) {
            return res.status(400).json({ error: "Aadhar number already exists for this school" });
        }

        const school = await School.findByPk(school_id);
        if (!school) return res.status(404).json({ error: "School not found" });

        if (!admissionNumber) {
            const latestAdmission = await Studentsslc.findOne({
                where: { school_id },
                order: [['id', 'DESC']],
                attributes: ['admissionNumber']
            });

            let nextSequentialNumber = 1;
            let padLength = 4; // default minimum 4 digits
            if (latestAdmission?.admissionNumber) {
                // Match any trailing digits — works for 4, 5, 6... digit numbers
                const match = latestAdmission.admissionNumber.match(/(\d+)$/);
                if (match) {
                    nextSequentialNumber = parseInt(match[1], 10) + 1;
                    // Preserve the digit length of the last number (min 4)
                    padLength = Math.max(4, match[1].length);
                }
            }
            // padStart only pads — it never truncates, so 9999+1=10000 is stored as-is
            const paddedNumber = String(nextSequentialNumber).padStart(padLength, '0');
            admissionNumber = `${school.shortcode}SSLC${paddedNumber}`;
        }

        const count = await Studentsslc.count({ where: { school_id, academicYear } });
        const sequence = String(count + 1).padStart(4, '0');
        const applicationNumber = `${school.shortcode}/APP/${academicYear}/${sequence}`;
        const parsedAge = typeof age === 'string' ? JSON.parse(age) : age;

        const newStudentsslc = await Studentsslc.create({
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
            dob,
            age: parsedAge,
            medium,
            nationality,
            state,
            motherTongue,
            hometown,
            religion,
            community,
            caste,
            tribecommunity,
            exgratiasalary,
            religionchanging,
            living,
            vaccinated,
            identificationmarks,
            bloodGroup,
            physical,
            physicalDetails,
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
            academicHistory,
            parentconsentform,
            passorfail,
            tceslc,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
            studentType: "new",
            status: "active",
        });

        return res.status(201).json({
            message: "Application created successfully",
            application: newStudentsslc
        });
    } catch (error) {
        console.error("Error creating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────────────────────────────────────
controller.getAllStudentsslc = async (req, res) => {
    try {
        const studentsslcs = await Studentsslc.findAll({
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] }
            ]
        });
        res.json({ studentsslcs });
    } catch (error) {
        console.error("Error fetching studentsslcs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL BY YEAR (superadmin)
// Route: GET /studentsslc/getAllStudentsslcByYear/:year
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET ALL BY YEAR — ALL SCHOOLS  (superadmin)
// Mirrors getStudentsslcsBySchoolAndYear but without school_id filter.
// Shows promoted/demoted students with correct isLocked flags.
//
// CASE A: promoted OUT of this year   → show with snapshot grade/section, LOCKED
// CASE B: demoted  OUT of this year   → show with snapshot grade/section, LOCKED
// CASE C: currently lives in this year → show live data, UNLOCKED
// ─────────────────────────────────────────────────────────────────────────────
controller.getAllStudentsslcByYear = async (req, res) => {
    try {
        const { year } = req.params;

        // 1. All non-removed students across ALL schools
        const allStudents = await Studentsslc.findAll({
            where: {
                status: { [Op.ne]: "Removed" },
            },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });

        // 2. Promotion snapshots for this year (all schools)
        const promotionSnapshots = await PromotionHistory.findAll({
            where: { fromAcademicYear: year, type: "promotion" },
            include: [
                { model: Grade,   as: "FromGrade",   attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        // 3. Demotion snapshots for this year (all schools)
        const demotionSnapshots = await PromotionHistory.findAll({
            where: { fromAcademicYear: year, type: "demotion" },
            include: [
                { model: Grade,   as: "FromGrade",   attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        const promotionMap = {};
        const demotionMap  = {};
        for (const snap of promotionSnapshots) promotionMap[snap.student_id] = snap;
        for (const snap of demotionSnapshots)  demotionMap[snap.student_id]  = snap;

        const result = [];

        for (const student of allStudents) {
            const promSnap = promotionMap[student.id];
            const demSnap  = demotionMap[student.id];

            if (promSnap) {
                // CASE A: Promoted OUT of this year → show with from-snapshot, LOCKED
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id:    promSnap.from_grade_id,
                    section_id:  promSnap.from_section_id,
                    Grade:   { id: promSnap.from_grade_id,   grade:       promSnap.FromGrade?.grade         || "N/A" },
                    Section: { id: promSnap.from_section_id, sectionName: promSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: true,
                    isDemoted:  false,
                    isLocked:   true,
                });
            } else if (demSnap) {
                // CASE B: Demoted OUT of this year → show with from-snapshot, LOCKED
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id:    demSnap.from_grade_id,
                    section_id:  demSnap.from_section_id,
                    Grade:   { id: demSnap.from_grade_id,   grade:       demSnap.FromGrade?.grade         || "N/A" },
                    Section: { id: demSnap.from_section_id, sectionName: demSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: false,
                    isDemoted:  true,
                    isLocked:   true,
                });
            } else if (student.academicYear === year) {
                // CASE C: Student currently lives in this year → UNLOCKED
                result.push({
                    ...student.toJSON(),
                    isPromoted: false,
                    isDemoted:  false,
                    isLocked:   false,
                });
            }
            // Different year, no snapshot → skip
        }

        return res.status(200).json({ studentsslcs: result });
    } catch (error) {
        console.error("Error fetching studentsslcs by year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsslcsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;

        const students = await Studentsslc.findAll({
            where: {
                school_id,
                status: { [Op.ne]: "Removed" }
            },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] }
            ]
        });

        // Build a promotion-history map keyed by student_id → their CURRENT year's snapshot
        // so badges show correctly even when no year filter is active.
        const allHistory = await PromotionHistory.findAll({
            where: { school_id },
            include: [
                { model: Grade,   as: "FromGrade",   attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        // For each student keep the most-recent snapshot (by dateOfPromotion)
        const historyMap = {};
        for (const snap of allHistory) {
            const existing = historyMap[snap.student_id];
            if (!existing || new Date(snap.dateOfPromotion) > new Date(existing.dateOfPromotion)) {
                historyMap[snap.student_id] = snap;
            }
        }

        const studentsslcs = students.map((student) => {
            const snap = historyMap[student.id];

            // Only mark as promoted/demoted when the snapshot is from the student's
            // current academicYear (i.e. they were moved OUT of the year they are
            // currently being shown under).
            if (snap && snap.fromAcademicYear === student.academicYear) {
                return {
                    ...student.toJSON(),
                    isPromoted: snap.type === "promotion",
                    isDemoted:  snap.type === "demotion",
                    isLocked:   true,
                };
            }

            return {
                ...student.toJSON(),
                isPromoted: false,
                isDemoted:  false,
                isLocked:   false,
            };
        });

        res.status(200).json({ studentsslcs });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// AGE CALCULATOR (internal helper)
// ─────────────────────────────────────────────────────────────────────────────
const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today     = new Date();

    let years  = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth()    - birthDate.getMonth();
    let days   = today.getDate()     - birthDate.getDate();

    if (days < 0) {
        months--;
        days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months, days };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsslcById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Studentsslc.findByPk(id, {
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] }
            ]
        });

        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        const appData = application.toJSON();
        if (appData.academicHistory && typeof appData.academicHistory === "string") {
            try {
                appData.academicHistory = JSON.parse(appData.academicHistory);
            } catch (err) {
                console.error("Error parsing academicHistory:", err);
                appData.academicHistory = [];
            }
        }
        appData.age = calculateAge(application.dob);

        res.json({ application: appData });
    } catch (error) {
        console.error("Error fetching application by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
controller.updateStudentsslc = async (req, res) => {
    try {
        const { id } = req.params;
        const existingStudent = await Studentsslc.findByPk(id);

        if (!existingStudent) {
            return res.status(404).json({ error: "Application not found" });
        }

        const updatedData = { ...req.body };

        if (typeof updatedData.age === 'object' && updatedData.age !== null) {
            const { years = 0, months = 0, days = 0 } = updatedData.age;
            updatedData.age = `${years}y ${months}m ${days}d`;
        }

        if (updatedData.academicHistory && typeof updatedData.academicHistory !== "string") {
            updatedData.academicHistory = JSON.stringify(updatedData.academicHistory);
        }

        await existingStudent.update(updatedData);

        return res.json({
            message: "Application updated successfully",
            application: existingStudent
        });
    } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE (status → Removed)
// ─────────────────────────────────────────────────────────────────────────────
controller.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Studentsslc.findByPk(id);
        if (!student) return res.status(404).json({ error: "Application not found" });
        await student.update({ status: "Removed" });
        res.json({ message: "Application removed successfully" });
    } catch (error) {
        console.error("Error removing application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ADMISSION NUMBER
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsslcByAdmission = async (req, res) => {
    try {
        const { admissionNumber } = req.params;
        const { academicYear }    = req.query;

        if (!academicYear) {
            return res.status(400).json({ error: "Academic Year is required" });
        }

        const cleanAcademicYear = academicYear.trim();

        const student = await Studentsslc.findOne({
            where: {
                admissionNumber: admissionNumber.trim(),
                academicYear:    cleanAcademicYear,
                status:          { [Op.ne]: "Removed" }
            },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] }
            ]
        });

        if (!student) {
            return res.status(404).json({ error: "Student not found for selected Academic Year" });
        }

        return res.status(200).json({ student });
    } catch (error) {
        console.error("Error fetching student:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW STUDENTS (bulk TC)
// Checks fee dues BEFORE allowing the withdrawal.
// ─────────────────────────────────────────────────────────────────────────────
controller.withdrawStudents = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { ids, reason, school_id, academic_year } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No student IDs provided" });
        }
        if (!school_id) {
            return res.status(400).json({ error: "school_id is required" });
        }

        const school = await School.findByPk(school_id);
        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }

        // ── Fee Due Check ─────────────────────────────────────────────────────
        // Fetch all selected students to get their admission numbers and names
        const selectedStudents = await Studentsslc.findAll({
            where: { id: ids },
            attributes: ["id", "name", "admissionNumber", "academicYear"],
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
                    academic_year:    yearToCheck,
                    admission_number: student.admissionNumber,
                    status:           { [Op.in]: ["Unpaid", "Partial"] },
                },
                attributes: ["id", "total_amount", "paid_amount", "balance_amount", "status", "fee_items"],
            });

            if (unpaidDemands.length > 0) {
                // Sum up the total outstanding balance across all unpaid/partial demands
                const totalBalance = unpaidDemands.reduce((sum, d) => {
                    const bal = parseFloat(d.balance_amount ?? (d.total_amount - d.paid_amount)) || 0;
                    return sum + bal;
                }, 0);

                // Collect the fee types that are still pending for better error messaging
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
                    id:              student.id,
                    name:            student.name,
                    admissionNumber: student.admissionNumber,
                    academicYear:    yearToCheck,
                    balance_amount:  parseFloat(totalBalance.toFixed(2)),
                    pendingFeeTypes: [...new Set(pendingFeeTypes)],   // de-duplicate
                    demandCount:     unpaidDemands.length,
                });
            }
        }

        // Block the TC if ANY selected student still has pending dues
        if (studentsWithDues.length > 0) {
            await transaction.rollback();
            const names = studentsWithDues.map((s) => `${s.name} (₹${s.balance_amount})`).join(", ");
            return res.status(400).json({
                error:           `Cannot issue TC. The following student(s) have pending fee dues: ${names}. Please clear all dues before issuing TC.`,
                studentsWithDues,
                hasDues:         true,
            });
        }
        // ── /Fee Due Check ────────────────────────────────────────────────────

        const lastWithdrawal = await Studentsslc.findOne({
            where: {
                school_id,
                withdrawalNumber: { [Op.ne]: null }
            },
            order:      [['withdrawalNumber', 'DESC']],
            attributes: ['withdrawalNumber']
        });

        let nextNumber = 1;
        if (lastWithdrawal && lastWithdrawal.withdrawalNumber) {
            const match = lastWithdrawal.withdrawalNumber.match(/WR-(\d+)$/);
            if (match) nextNumber = parseInt(match[1]) + 1;
        }

        const updates = [];
        for (let i = 0; i < ids.length; i++) {
            const withdrawalNumber = `${school.shortcode}/SSLC/WR-${nextNumber}`;
            updates.push(
                Studentsslc.update(
                    {
                        withdrawalNumber,
                        withdrawReason: reason,
                        withdrawnAt:    new Date(),
                        status:         "Withdrawn"
                    },
                    { where: { id: ids[i] }, transaction }
                )
            );
            nextNumber++;
        }

        await Promise.all(updates);
        await transaction.commit();

        return res.status(200).json({ message: "Students withdrawn successfully" });
    } catch (error) {
        await transaction.rollback();
        console.error("Error withdrawing students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL TC STUDENTS (superadmin)
// ─────────────────────────────────────────────────────────────────────────────
controller.getTCStudents = async (req, res) => {
    try {
        const students = await Studentsslc.findAll({
            where: { status: "Withdrawn" },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] }
            ],
            order: [['withdrawnAt', 'DESC']]
        });
        res.status(200).json({ students });
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
        const students = await Studentsslc.findAll({
            where: { school_id, status: "Withdrawn" },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] }
            ],
            order: [['withdrawnAt', 'DESC']]
        });
        res.status(200).json({ students });
    } catch (error) {
        console.error("Error fetching TC students by school:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET STUDENTS BY GRADE + ACADEMIC YEAR
// Route: GET /studentsslc/getStudentsByGradeYear?school_id=&academicYear=&grade_id=
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsByGradeYear = async (req, res) => {
    try {
        const { school_id, academicYear, grade_id } = req.query;

        if (!school_id || !academicYear || !grade_id) {
            return res.status(400).json({ message: "school_id, academicYear and grade_id are required" });
        }

        const students = await Studentsslc.findAll({
            where: { school_id, academicYear, grade_id, status: "active" },
            attributes: ["id", "name", "admissionNumber", "gender", "fatherName"],
            include: [
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
            order: [["name", "ASC"]],
        });

        res.json({ students });
    } catch (error) {
        console.error("Error fetching students by grade/year:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET STUDENTS BY FILTER (school + year + grade + section)
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsByFilter = async (req, res) => {
    try {
        const { school_id, academicYear, grade_id, section_id } = req.query;

        if (!school_id || !academicYear || !grade_id || !section_id) {
            return res.status(400).json({ message: "school_id, academicYear, grade_id and section_id are required" });
        }

        const students = await Studentsslc.findAll({
            where: { school_id, academicYear, grade_id, section_id, status: "active" },
            attributes: ["id", "name", "admissionNumber", "gender", "dob", "fatherName"],
            include: [
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
            order: [["name", "ASC"]],
        });

        res.json({ students });
    } catch (error) {
        console.error("Error fetching students by filter:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROMOTION HISTORY BY SCHOOL
// ─────────────────────────────────────────────────────────────────────────────
controller.getPromotionHistory = async (req, res) => {
    try {
        const { school_id } = req.params;

        const history = await PromotionHistory.findAll({
            where: { school_id },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   as: "FromGrade",   attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
                { model: Grade,   as: "ToGrade",     attributes: ["id", "grade"] },
                { model: Section, as: "ToSection",   attributes: ["id", "sectionName"] },
            ],
            order: [["dateOfPromotion", "DESC"]],
        });

        return res.status(200).json({ history });
    } catch (error) {
        console.error("Error fetching promotion history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET STUDENTS BY SCHOOL + YEAR  (with promotion AND demotion snapshot support)
//
// LOCK / UNLOCK TRUTH TABLE (mirrors HSC logic)
// ─────────────────────────────────────────────────────────────────────────────
// Action                       │ Filter 2025-26           │ Filter 2026-27
// ─────────────────────────────┼──────────────────────────┼────────────────────
// Promote 2025-26 → 2026-27    │ LOCKED  (promSnap found) │ UNLOCKED (CASE C)
// Demote  2026-27 → 2025-26    │ UNLOCKED (CASE C)        │ LOCKED  (demSnap)
// Re-promote 2025-26 → 2026-27 │ LOCKED  (promSnap found) │ UNLOCKED (CASE C)
// ─────────────────────────────────────────────────────────────────────────────
controller.getStudentsslcsBySchoolAndYear = async (req, res) => {
    try {
        const { school_id, year } = req.params;

        // 1. All students for this school (any year) except hard-deleted
        const allStudents = await Studentsslc.findAll({
            where: {
                school_id,
                status: { [Op.ne]: "Removed" },
            },
            include: [
                { model: School,  attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade,   attributes: ["id", "grade"] },
                { model: Section, as: "Section", attributes: ["id", "sectionName"] },
            ],
        });

        // 2. Promotion snapshots: student was promoted OUT of this year
        const promotionSnapshots = await PromotionHistory.findAll({
            where: { school_id, fromAcademicYear: year, type: "promotion" },
            include: [
                { model: Grade,   as: "FromGrade",   attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        // 3. Demotion snapshots: student was demoted OUT of this year
        const demotionSnapshotsFrom = await PromotionHistory.findAll({
            where: { school_id, fromAcademicYear: year, type: "demotion" },
            include: [
                { model: Grade,   as: "FromGrade",   attributes: ["id", "grade"] },
                { model: Section, as: "FromSection", attributes: ["id", "sectionName"] },
            ],
        });

        const promotionMap    = {};
        const demotionFromMap = {};
        for (const snap of promotionSnapshots)    promotionMap[snap.student_id]    = snap;
        for (const snap of demotionSnapshotsFrom) demotionFromMap[snap.student_id] = snap;

        const result = [];

        for (const student of allStudents) {
            const promSnap = promotionMap[student.id];
            const demSnap  = demotionFromMap[student.id];

            if (promSnap) {
                // ── CASE A: Promoted OUT of this year → LOCKED ──────────────────
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id:    promSnap.from_grade_id,
                    section_id:  promSnap.from_section_id,
                    Grade:   { id: promSnap.from_grade_id,   grade:       promSnap.FromGrade?.grade         || "N/A" },
                    Section: { id: promSnap.from_section_id, sectionName: promSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: true,
                    isDemoted:  false,
                    isLocked:   true,
                });

            } else if (demSnap) {
                // ── CASE B: Demoted OUT of this year → LOCKED ───────────────────
                result.push({
                    ...student.toJSON(),
                    academicYear: year,
                    grade_id:    demSnap.from_grade_id,
                    section_id:  demSnap.from_section_id,
                    Grade:   { id: demSnap.from_grade_id,   grade:       demSnap.FromGrade?.grade         || "N/A" },
                    Section: { id: demSnap.from_section_id, sectionName: demSnap.FromSection?.sectionName || "N/A" },
                    isPromoted: false,
                    isDemoted:  true,
                    isLocked:   true,
                });

            } else if (student.academicYear === year) {
                // ── CASE C: Student currently lives in this year → UNLOCKED ─────
                result.push({
                    ...student.toJSON(),
                    isPromoted: false,
                    isDemoted:  false,
                    isLocked:   false,
                });
            }
            // Student belongs to a completely different year with no snapshot → skip
        }

        return res.status(200).json({ studentsslcs: result });
    } catch (error) {
        console.error("Error fetching students by school and year:", error);
        res.status(500).json({ message: "Failed to fetch students", details: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTE SSLC STUDENTS
//
//   1. promote 2025-26 → 2026-27
//        deletes: demotion(from=2026-27) if exists  ← clears stale lock
//        writes:  promotion(from=2025-26)            → 2025-26 LOCKED
//        student: academicYear=2026-27               → 2026-27 UNLOCKED (CASE C)
//
//   2. demote 2026-27 → 2025-26
//        deletes: promotion(from=2025-26)            → 2025-26 UNLOCKED (CASE C)
//        writes:  demotion(from=2026-27)             → 2026-27 LOCKED
//        student: academicYear=2025-26
//
//   3. RE-PROMOTE 2025-26 → 2026-27
//        deletes: demotion(from=2026-27)  ✅         → 2026-27 stale lock cleared
//        writes:  promotion(from=2025-26)            → 2025-26 LOCKED
//        student: academicYear=2026-27               → 2026-27 UNLOCKED (CASE C)✅
// ─────────────────────────────────────────────────────────────────────────────
controller.promoteStudents = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentIds, toAcademicYear, toGradeId, toSectionId } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: "studentIds array is required" });
        }
        if (!toAcademicYear) return res.status(400).json({ error: "toAcademicYear is required" });
        if (!toGradeId)      return res.status(400).json({ error: "toGradeId is required" });
        if (!toSectionId)    return res.status(400).json({ error: "toSectionId is required" });

        // Verify target grade & section exist
        const grade   = await Grade.findByPk(toGradeId);
        const section = await Section.findByPk(toSectionId);
        if (!grade)   return res.status(404).json({ error: "Target grade not found" });
        if (!section) return res.status(404).json({ error: "Target section not found" });

        const students = await Studentsslc.findAll({
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
            const existing = await PromotionHistory.findOne({
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
            await PromotionHistory.destroy({
                where: { student_id: student.id, fromAcademicYear: toAcademicYear, type: "demotion" },
                transaction,
            });
        }

        // STEP 2: Write PROMOTION history snapshot
        const historyRows = students.map((student) => ({
            student_id:       student.id,
            admissionNumber:  student.admissionNumber,
            studentName:      student.name,
            fromAcademicYear: student.academicYear,
            from_grade_id:    student.grade_id,
            from_section_id:  student.section_id,
            toAcademicYear,
            to_grade_id:      toGradeId,
            to_section_id:    toSectionId,
            school_id:        student.school_id,
            dateOfPromotion,
            type:             "promotion",
            studentType:      student.studentType || "new",
        }));
        await PromotionHistory.bulkCreate(historyRows, { transaction });

        // STEP 3: Move student to the new year — also mark type as "old"
        const updates = students.map((student) =>
            student.update(
                { academicYear: toAcademicYear, grade_id: toGradeId, section_id: toSectionId, status: "active", studentType: "old" },
                { transaction }
            )
        );
        await Promise.all(updates);

        await transaction.commit();
        return res.status(200).json({
            message:  `${students.length} student(s) promoted successfully`,
            promoted: students.length,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error promoting SSLC students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEMOTE SSLC STUDENTS
// ─────────────────────────────────────────────────────────────────────────────
controller.demoteStudents = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { studentIds, toAcademicYear, toGradeId, toSectionId } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: "studentIds array is required" });
        }
        if (!toAcademicYear) return res.status(400).json({ error: "toAcademicYear is required" });
        if (!toGradeId)      return res.status(400).json({ error: "toGradeId is required" });
        if (!toSectionId)    return res.status(400).json({ error: "toSectionId is required" });

        const students = await Studentsslc.findAll({
            where: { id: studentIds, status: { [Op.notIn]: ["Removed", "TC Issued", "Withdrawn"] } },
            transaction,
        });

        if (students.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "No eligible students found for the given IDs" });
        }

        // Guard: block double-demotion from the same year
        const alreadyDemoted = [];
        for (const student of students) {
            const existing = await PromotionHistory.findOne({
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
            await PromotionHistory.destroy({
                where: { student_id: student.id, fromAcademicYear: toAcademicYear, type: "promotion" },
                transaction,
            });
        }

        // STEP 2: Record DEMOTION history snapshot (locks current year)
        const historyRows = students.map((student) => ({
            student_id:       student.id,
            admissionNumber:  student.admissionNumber,
            studentName:      student.name,
            fromAcademicYear: student.academicYear,
            from_grade_id:    student.grade_id,
            from_section_id:  student.section_id,
            toAcademicYear,
            to_grade_id:      toGradeId,
            to_section_id:    toSectionId,
            school_id:        student.school_id,
            dateOfPromotion,
            type:             "demotion",
            studentType:      student.studentType || "new",
        }));
        await PromotionHistory.bulkCreate(historyRows, { transaction });

        // STEP 3: Move student back to previous year — also mark type as "old"
        const updates = students.map((student) =>
            student.update(
                { academicYear: toAcademicYear, grade_id: toGradeId, section_id: toSectionId, status: "active", studentType: "old" },
                { transaction }
            )
        );
        await Promise.all(updates);

        await transaction.commit();
        return res.status(200).json({
            message: `${students.length} student(s) demoted successfully`,
            demoted: students.length,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error demoting SSLC students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getActiveStudentsslcCount = async (req, res) => {
  try {
    const { schoolId, year } = req.query;

    const where = {
      status: "active",
    };

    if (schoolId) where.school_id = schoolId;
    if (year) where.academicYear = year;

    const count = await Studentsslc.count({ where });

    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch SSLC count" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHECK FEE DUES BEFORE TC
// POST /studentsslc/checkFeeDuesBeforeTc
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
        const students = await Studentsslc.findAll({
            where: { id: studentIds },
            attributes: ["id", "name", "admissionNumber", "academicYear"],
        });

        if (students.length === 0) {
            return res.status(404).json({ error: "No students found for the provided IDs" });
        }

        const studentsWithDues = [];

        for (const student of students) {
            // Use the caller-supplied academic_year; fall back to the student's own year
            const yearToCheck = academic_year || student.academicYear;
            if (!yearToCheck) continue;

            // Find every fee demand for this student that is still unpaid or partially paid
            const unpaidDemands = await StudentFeeDemand.findAll({
                where: {
                    school_id,
                    academic_year:    yearToCheck,
                    admission_number: student.admissionNumber,
                    status:           { [Op.in]: ["Unpaid", "Partial"] },
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
                id:              student.id,
                name:            student.name,
                admissionNumber: student.admissionNumber,
                academicYear:    yearToCheck,
                balance_amount:  parseFloat(totalBalance.toFixed(2)),
                pendingFeeTypes: [...new Set(pendingFeeTypes)],
                demandCount:     unpaidDemands.length,
            });
        }

        if (studentsWithDues.length > 0) {
            return res.status(200).json({
                hasDues:         true,
                studentsWithDues,
                message:         `${studentsWithDues.length} student(s) have pending fee dues.`,
            });
        }

        return res.status(200).json({
            hasDues:         false,
            studentsWithDues: [],
            message:         "No pending fee dues. TC can be issued.",
        });
    } catch (error) {
        console.error("Error checking fee dues before TC:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

//fees
controller.getAllStudents = async (req, res) => {
  try {
    const { school_id, academic_year, grade, section, medium, studentType } =
      req.query;

    if (!school_id || !academic_year)
      return res
        .status(400)
        .json({ message: "school_id and academic_year are required" });

    const where = {
      school_id,
      academicYear: academic_year,
      status: "active",
    };

    let students = await Studentsslc.findAll({
      where,
      include: [
        { model: School, attributes: ["id", "name", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
        { model: Grade, attributes: ["id", "grade"] },
        { model: Section, as: "Section", attributes: ["id", "sectionName"] },
      ],
    });

    // Post-query filters (grade & section come from joins, not direct columns)
    if (grade) {
      students = students.filter((s) => s?.Grade?.grade === grade);
    }
    if (section) {
      students = students.filter((s) => s?.Section?.sectionName === section);
    }
    if (medium) {
      students = students.filter(
        (s) => (s.medium || "").toLowerCase() === medium.toLowerCase(),
      );
    }
    if (studentType) {
      students = students.filter(
        (s) =>
          (s.studentType || s.student_type || "").toLowerCase() ===
          studentType.toLowerCase(),
      );
    }

    res.status(200).json({ data: students });
  } catch (error) {
    console.error("getAllStudents error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;