const { Applicationsslc, School, Grade, Studentsslc, Section } = require("../models");

const controller = {};
const { Op } = require("sequelize");
const sequelize = require("../config/database");


controller.createApplicationsslc = async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        const {
            school_id,
            academicYear,
            emisNum,
            aadharNumber,
            name,
            gender,
            grade_id,
            section_id,
            dob,
            age,
            mobileNumber,
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
            telephoneNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            parentconsentform,
            academicHistory,
            passorfail,
            tceslc,
            medium,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
            remarks
        } = req.body;

        // Validate REQUIRED fields first!
        if (!academicYear || !school_id) {
            return res.status(400).json({
                error: "academicYear and school_id are required"
            });
        }

        // ✅ Check for duplicate Aadhar number within the same school (only if provided)
        if (aadharNumber) {
            const aadharExists = await Applicationsslc.findOne({
                where: { aadharNumber, school_id }
            });
            if (aadharExists) {
                return res.status(400).json({ error: "Aadhar number already exists for this school" });
            }
        }

        // Get school details with shortcode
        const school = await School.findByPk(school_id);
        if (!school) return res.status(404).json({ error: "School not found" });

        // Generate application number
        const count = await Applicationsslc.count({
            where: { school_id, academicYear: academicYear }
        });

        const sequence = String(count + 1).padStart(4, '0');
        const applicationNumber = `${school.shortcode}/APP-SSLC/${academicYear}/${sequence}`;

        // Ensure academicHistory is stored as a JSON string
        let academicHistoryToStore = null;
        if (academicHistory) {
            if (typeof academicHistory === "string") {
                // Validate it's valid JSON
                try { JSON.parse(academicHistory); academicHistoryToStore = academicHistory; }
                catch { academicHistoryToStore = JSON.stringify([]); }
            } else if (Array.isArray(academicHistory)) {
                academicHistoryToStore = JSON.stringify(academicHistory);
            } else {
                academicHistoryToStore = JSON.stringify([]);
            }
        }

        // Create application
        const newApplicationsslc = await Applicationsslc.create({
            school_id,
            academicYear,
            applicationNumber,
            emisNum:        emisNum        || null,
            aadharNumber:   aadharNumber   || null,
            name,
            gender,
            grade_id,
            section_id,
            dob,
            age,
            mobileNumber:   mobileNumber   || null,
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
            pincode:        pincode        || null,
            parentEmail,
            telephoneNumber: telephoneNumber || null,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber: guardianNumber  || null,
            parentconsentform,
            academicHistory: academicHistoryToStore,
            passorfail,
            tceslc,
            medium,
            bankName,
            branchName,
            accountNumber:  accountNumber  || null,
            ifsccode,
            studentStatus: "Applied",
            remarks:        remarks        || null,
        });

        return res.status(201).json({
            message: "Application created successfully",
            application: newApplicationsslc
        });
    } catch (error) {
        console.error("Error creating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllApplicationsslc = async (req, res) => {
    try {
        const applicationsslcs = await Applicationsslc.findAll({
            where: {
                studentStatus: { [Op.ne]: "Removed" }
            },
            include: [
                { model: School, attributes: ["id", "name", "shortcode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: {
                include: ["remarks"]
            }
        });
        return res.json({ applicationsslcs });
    } catch (error) {
        console.error("Error fetching applicationsslcs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getApplicationsslcsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID required" });

        const applicationsslcs = await Applicationsslc.findAll({
            where: {
                school_id,
                studentStatus: { [Op.ne]: "Removed" }
            },
            include: [
                { model: School, attributes: ["id", "name", "shortcode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: {
                exclude: [],
                include: ["remarks"]
            }
        });

        res.status(200).json({ applicationsslcs });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal error", details: error.message });
    }
};

controller.admitStudent = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { applicationId } = req.params;
        const { section_id } = req.body;

        if (!section_id) {
            await transaction.rollback();
            return res.status(400).json({ error: "section_id is required" });
        }

        // ── 1. Load application ──
        const application = await Applicationsslc.findByPk(applicationId, { transaction });
        if (!application) {
            await transaction.rollback();
            return res.status(404).json({ error: "Application not found" });
        }
        if (application.studentStatus !== "Applied") {
            await transaction.rollback();
            return res.status(400).json({ error: "Student has already been admitted or removed" });
        }

        // ── 2. Load school ──
        const school = await School.findByPk(application.school_id, { transaction });
        if (!school) {
            await transaction.rollback();
            return res.status(404).json({ error: "School not found" });
        }

        // ── 2b. Guard: application fee must be collected before admission (fee-applicable schools only) ──
        const RLMHSS_SHORTCODE = "RLMHSS";
        const isFeeApplicableSchool = (() => {
            const shortcode = (school?.shortcode || "").toUpperCase().trim();
            const name = (school?.name || "").toUpperCase().trim();
            return shortcode === RLMHSS_SHORTCODE || name.includes("RANI LADY") || name.includes("MEYYAMMAI");
        })();
        if (isFeeApplicableSchool && !application.feeCollected) {
            await transaction.rollback();
            return res.status(400).json({ error: "Application fee must be collected before admitting this student" });
        }

        // ── 3. Verify section ──
        const section = await Section.findByPk(section_id, { transaction });
        if (!section) {
            await transaction.rollback();
            return res.status(404).json({ error: "Section not found" });
        }

        // ── 4. Generate admission number ──
        // Format: RLMHSSSSLC0003 (4 digits) growing naturally to RLMHSSSSLC121217 (6+ digits).
        // Ordered by id DESC (not admissionNumber DESC) — string sort of admissionNumber is
        // unreliable once digit lengths differ (e.g. "9999" would sort above "121217").
        const prefix = `${school.shortcode}SSLC`;
        const lastStudent = await Studentsslc.findOne({
            where: {
                school_id: application.school_id,
                admissionNumber: { [Op.like]: `${prefix}%` }
            },
            order: [["id", "DESC"]],
            attributes: ["admissionNumber"],
            transaction
        });

        let nextSeq = 1;
        let padLength = 4; // default minimum 4 digits
        if (lastStudent?.admissionNumber) {
            // Match ALL trailing digits, not just exactly 4 — works for 4, 5, 6+ digit numbers
            const match = lastStudent.admissionNumber.match(/(\d+)$/);
            if (match) {
                nextSeq = parseInt(match[1], 10) + 1;
                // Preserve the digit length of the last number (min 4) so it never shrinks
                padLength = Math.max(4, match[1].length);
            }
        }
        // padStart only pads — never truncates, so 9999+1=10000 grows naturally to 5, 6+ digits
        const admissionNumber = `${prefix}${String(nextSeq).padStart(padLength, "0")}`;

        // ── 5. Parse JSON fields safely ──
        const parsedAge =
            typeof application.age === "string"
                ? (() => { try { return JSON.parse(application.age); } catch { return application.age; } })()
                : application.age;

        const parsedHistory = (() => {
            let h = application.academicHistory;
            if (typeof h === "string") {
                try { h = JSON.parse(h); } catch { return []; }
                if (typeof h === "string") { try { h = JSON.parse(h); } catch { return []; } }
            }
            return Array.isArray(h) ? h : [];
        })();

        // ── 6. Create Studentsslc row ──
        const student = await Studentsslc.create(
            {
                admissionNumber,
                academicYear: application.academicYear,
                dateofjoin: new Date(),
                school_id: application.school_id,
                grade_id: application.grade_id,
                section_id: Number(section_id),
                emisNum: application.emisNum,
                aadharNumber: application.aadharNumber,
                name: application.name,
                gender: application.gender,
                dob: application.dob,
                age: parsedAge,
                mobileNumber: application.mobileNumber,
                nationality: application.nationality,
                state: application.state,
                motherTongue: application.motherTongue,
                hometown: application.hometown,
                religion: application.religion,
                community: application.community,
                caste: application.caste,
                tribecommunity: application.tribecommunity,
                exgratiasalary: application.exgratiasalary,
                religionchanging: application.religionchanging,
                living: application.living,
                vaccinated: application.vaccinated,
                identificationmarks: application.identificationmarks,
                bloodGroup: application.bloodGroup,
                physical: application.physical,
                physicalDetails: application.physicalDetails,

                fatherName: application.fatherName,
                motherName: application.motherName,
                fatherOccupation: application.fatherOccupation,
                motherOccupation: application.motherOccupation,
                fatherIncome: application.fatherIncome,
                motherIncome: application.motherIncome,
                address: application.address,
                pincode: application.pincode,
                parentEmail: application.parentEmail,
                telephoneNumber: application.telephoneNumber,
                guardianName: application.guardianName,
                guardianOccupation: application.guardianOccupation,
                guardianAddress: application.guardianAddress,
                guardianNumber: application.guardianNumber,

                academicHistory: parsedHistory,
                parentconsentform: application.parentconsentform,
                passorfail: application.passorfail,
                tceslc: application.tceslc,
                medium: application.medium,

                bankName: application.bankName,
                branchName: application.branchName,
                accountNumber: application.accountNumber,
                ifsccode: application.ifsccode,

                studentType: "new",
                status: "active",
            },
            { transaction }
        );

        // ── 7. Update application section_id and mark as Admitted ──
        await application.update(
            { studentStatus: "Admitted", section_id: Number(section_id) },
            { transaction }
        );

        await transaction.commit();

        return res.status(200).json({
            message: "Student admitted successfully",
            admissionNumber: student.admissionNumber,
            studentId: student.id,
        });

    } catch (error) {
        await transaction.rollback();
        console.error("admitStudent error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

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

controller.getApplicationsslcById = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await Applicationsslc.findByPk(id, {
            include: [
                { model: School },
                { model: Grade }
            ]
        });

        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        const age = calculateAge(application.dob);

        // Parse academicHistory safely so frontend always gets an array
        // Handles: null, array, JSON string, or double-encoded JSON string
        let academicHistory = application.academicHistory;
        if (typeof academicHistory === "string") {
            try { academicHistory = JSON.parse(academicHistory); } catch { academicHistory = []; }
            // Handle double-encoded: after first parse it may still be a string
            if (typeof academicHistory === "string") {
                try { academicHistory = JSON.parse(academicHistory); } catch { academicHistory = []; }
            }
        }
        if (!Array.isArray(academicHistory)) academicHistory = [];

        const applicationWithAge = {
            ...application.toJSON(),
            age,
            academicHistory,   // ← always return as parsed array
        };

        res.json({ application: applicationWithAge });
    } catch (error) {
        console.error("Error fetching application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


controller.updateApplicationsslc = async (req, res) => {
    try {
        const { id } = req.params;
        const { emisNum, aadharNumber, academicHistory } = req.body;

        const existingApp = await Applicationsslc.findByPk(id);
        if (!existingApp) {
            return res.status(404).json({ error: "Application not found" });
        }

        // Check for duplicate Aadhar number only if it's changed
        if (aadharNumber && String(aadharNumber) !== String(existingApp.aadharNumber)) {
            const aadharExists = await Applicationsslc.findOne({
                where: {
                    aadharNumber,
                    school_id: existingApp.school_id,
                    id: { [Op.ne]: id }
                }
            });
            if (aadharExists) {
                return res.status(400).json({ error: "Aadhar number already exists for this school" });
            }
        }

        // Ensure academicHistory is stored as a JSON string in the DB
        let academicHistoryToStore = existingApp.academicHistory; // keep existing if not provided
        if (academicHistory !== undefined) {
            if (typeof academicHistory === "string") {
                try { JSON.parse(academicHistory); academicHistoryToStore = academicHistory; }
                catch { academicHistoryToStore = JSON.stringify([]); }
            } else if (Array.isArray(academicHistory)) {
                academicHistoryToStore = JSON.stringify(academicHistory);
            } else {
                academicHistoryToStore = JSON.stringify([]);
            }
        }

        // Build the update payload explicitly to prevent unwanted field overwrites
        const updatePayload = {
            ...req.body,
            academicHistory: academicHistoryToStore,
        };

        await existingApp.update(updatePayload);

        res.json({
            message: "Application updated successfully",
            application: existingApp
        });
    } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Soft Delete Application (status → Removed)
controller.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Applicationsslc.findByPk(id);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        await application.update({ studentStatus: "Removed" });

        res.json({ message: "Application removed successfully" });
    } catch (error) {
        console.error("Error removing application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─── collectApplicationFee ────────────────────────────────────────────────────
controller.collectApplicationFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMode, transactionId, paymentDate } = req.body;

        if (!paymentMode) {
            return res.status(400).json({ error: "paymentMode is required" });
        }
        if (paymentMode === "online" && !transactionId) {
            return res.status(400).json({ error: "transactionId is required for online payment" });
        }

        const application = await Applicationsslc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name", "shortcode", "address", "phoneNumber", "email", "logo", "city", "state", "pincode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });
        if (!application) return res.status(404).json({ error: "Application not found" });

        if (application.feeCollected) {
            return res.status(400).json({ error: "Fee already collected for this application" });
        }

        const school = application.School;
        const academicYear = application.academicYear;

        const existingCount = await Applicationsslc.count({
            where: {
                school_id: application.school_id,
                academicYear: academicYear,
                feeCollected: true
            }
        });

        const sequence = String(existingCount + 1).padStart(4, "0");
        // Receipt format: RLMHSS/APP-SSLC-FC/26-27/0001  (short year)
        const shortYear = academicYear.replace(/(\d{2})(\d{2})-(\d{2})(\d{2})/, "$2-$4");
        const receiptNumber = `${school.shortcode}/APP-SSLC-FC/${shortYear}/${sequence}`;

        await application.update({
            feeCollected: true,
            feeAmount: 100,
            paymentMode,
            transactionId: paymentMode === "online" ? transactionId : null,
            receiptNumber,
            feePaidAt: paymentDate ? new Date(paymentDate) : new Date()
        });

        const updated = await Applicationsslc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name", "shortcode", "address", "phoneNumber", "email", "logo", "city", "state", "pincode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });

        return res.status(200).json({
            message: "Fee collected successfully",
            receiptNumber,
            application: updated
        });
    } catch (error) {
        console.error("Error collecting fee:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};
 
// ─── getApplicationFeeStatus ──────────────────────────────────────────────────
controller.getApplicationFeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await Applicationsslc.findByPk(id, {
            attributes: ["id", "feeCollected", "receiptNumber", "feeAmount", "paymentMode", "transactionId", "feePaidAt"]
        });
        if (!application) return res.status(404).json({ error: "Application not found" });
        return res.json({ feeStatus: application });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
module.exports = controller;