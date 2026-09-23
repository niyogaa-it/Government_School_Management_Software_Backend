const { Applicationhsc, School, Grade, Studenthsc, Section } = require("../models");

const controller = {};

const { Op } = require("sequelize");
const sequelize = require("../config/database");

controller.createApplicationhsc = async (req, res) => {
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
            dob,
            age,
            mobileNumber,
            nationality,
            state,
            birthdistrict,
            community,
            caste,
            religion,
            scheduledcasteOrtribecommunity,
            backwardcaste,
            tribeTootherreligion,
            living,
            currentlivingaddress,
            identificationmarks,
            bloodGroup,
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
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            academicHistory,
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
            ifsccode
        } = req.body;

        // Validate REQUIRED fields first!
        if (!academicYear || !school_id) {
            return res.status(400).json({
                error: "academicYear and school_id are required"
            });
        }

        // ✅ Check for duplicate Aadhar number within the same school (only if provided)
        if (aadharNumber) {
            const aadharExists = await Applicationhsc.findOne({
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
        const count = await Applicationhsc.count({
            where: {
                school_id,
                academicYear: academicYear
            }
        });

        const sequence = String(count + 1).padStart(4, '0');
        const applicationNumber = `${school.shortcode}/APP-HSC/${academicYear}/${sequence}`;

        // Parse academicHistory if it is a JSON string
        let parsedAcademicHistory = academicHistory;
        if (typeof academicHistory === "string") {
            try { parsedAcademicHistory = JSON.parse(academicHistory); } catch { parsedAcademicHistory = null; }
        }

        // Create application
        const newApplicationhsc = await Applicationhsc.create({
            applicationNumber,
            school_id,
            academicYear,
            emisNum,
            aadharNumber,
            name,
            gender,
            grade_id,
            dob,
            age,
            mobileNumber,
            nationality,
            state,
            birthdistrict,
            community,
            caste,
            religion,
            scheduledcasteOrtribecommunity,
            backwardcaste,
            tribeTootherreligion,
            living,
            currentlivingaddress,
            motherTongue,
            identificationmarks,
            bloodGroup,
            fatherName,
            motherName,
            fatherOccupation,
            motherOccupation,
            fatherIncome,
            motherIncome,
            address,
            pincode,
            parentEmail,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            academicHistory: parsedAcademicHistory,
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
            studentStatus: "Applied",
        });

        return res.status(201).json({
            message: "Application created successfully",
            application: newApplicationhsc
        });
    } catch (error) {
        console.error("Error creating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllApplicationhsc = async (req, res) => {
    try {
        const applicationhscs = await Applicationhsc.findAll({
            where: {
                studentStatus: { [Op.ne]: "Removed" }
            },
            include: [
                { model: School, attributes: ["id", "name", "shortcode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });

        return res.json({ applicationhscs });
    } catch (error) {
        console.error("Error fetching applicationhscs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getApplicationhscsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID required" });

        const applicationhscs = await Applicationhsc.findAll({
            where: {
                school_id,
                studentStatus: { [Op.ne]: "Removed" }
            },
            include: [
                { model: School, attributes: ["id", "name", "shortcode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: {
                exclude: []
            }
        });

        res.status(200).json({ applicationhscs });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({
            error: "Internal error",
            details: error.message
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIT STUDENT
// Accepts: section_id (required), group_subjects (optional array of subject IDs)
// Saves group_subjects to BOTH Applicationhsc and Studenthsc
// ─────────────────────────────────────────────────────────────────────────────
controller.admitStudent = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { applicationId } = req.params;
        const { section_id, group_subjects } = req.body;

        // section_id is required
        if (!section_id) {
            await transaction.rollback();
            return res.status(400).json({ error: "section_id is required" });
        }

        // 1. Fetch application
        const application = await Applicationhsc.findByPk(applicationId, { transaction });
        if (!application) {
            await transaction.rollback();
            return res.status(404).json({ error: "Application not found" });
        }

        // 2. Guard: already admitted
        if (application.studentStatus === "Admitted") {
            await transaction.rollback();
            return res.status(400).json({ error: "Student is already admitted" });
        }

        // 2b. Guard: application fee must be collected before admission (fee-applicable schools only)
        const feeGateSchool = await School.findByPk(application.school_id, {
            attributes: ["id", "name", "shortcode"],
            transaction
        });
        const RLMHSS_SHORTCODE = "RLMHSS";
        const isFeeApplicableSchool = (() => {
            const shortcode = (feeGateSchool?.shortcode || "").toUpperCase().trim();
            const name = (feeGateSchool?.name || "").toUpperCase().trim();
            return shortcode === RLMHSS_SHORTCODE || name.includes("RANI LADY") || name.includes("MEYYAMMAI");
        })();
        if (isFeeApplicableSchool && !application.feeCollected) {
            await transaction.rollback();
            return res.status(400).json({ error: "Application fee must be collected before admitting this student" });
        }

        // 3. Check for duplicate EMIS in Studenthsc
        if (application.emisNum) {
            const emisExists = await Studenthsc.findOne({
                where: { emisNum: application.emisNum, school_id: application.school_id },
                transaction
            });
            if (emisExists) {
                await transaction.rollback();
                return res.status(400).json({ error: "A student with this EMIS number is already admitted" });
            }
        }

        // 4. Generate admission number
        // Format: RLMHSSHSC11324 — continuous sequence per school (NOT per academicYear),
        // never resets. Next number = last admission number's trailing digits + 1.
        const school = feeGateSchool;

        const latestAdmission = await Studenthsc.findOne({
            where: { school_id: application.school_id },
            order: [["id", "DESC"]],
            attributes: ["admissionNumber"],
            transaction
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
        // padStart only pads — never truncates, so 99999+1=100000 grows naturally
        const paddedNumber = String(nextSequentialNumber).padStart(padLength, "0");
        const newAdmissionNumber = `${school.shortcode}HSC${paddedNumber}`;

        // 5. Calculate age at admission
        const ageForStudent = (() => {
            const a = application.age;
            if (!a) return null;
            if (typeof a === "object") return JSON.stringify(a);
            return String(a);
        })();

        // 6. Normalise group_subjects
        const normalizedGroupSubjects = (() => {
            const a = group_subjects;
            if (!a) return null;
            if (Array.isArray(a)) return JSON.stringify(a);
            if (typeof a === "object") return JSON.stringify(a);
            return String(a);
        })();

        // 7. Create Studenthsc — section_id and group_subjects stored here
        await Studenthsc.create({
            admissionNumber: newAdmissionNumber,
            school_id: application.school_id,
            academicYear: application.academicYear,
            grade_id: application.grade_id,
            section_id: Number(section_id),
            group_subjects: normalizedGroupSubjects,
            dateofjoin: new Date(),
            status: "active",
            studentType: "new",
            name: application.name,
            gender: application.gender,
            emisNum: application.emisNum,
            aadharNumber: application.aadharNumber,
            dob: application.dob,
            age: ageForStudent,
            mobileNumber: application.mobileNumber,
            nationality: application.nationality,
            state: application.state,
            birthdistrict: application.birthdistrict,
            community: application.community,
            caste: application.caste,
            religion: application.religion,
            scheduledcasteOrtribecommunity: application.scheduledcasteOrtribecommunity,
            backwardcaste: application.backwardcaste,
            tribeTootherreligion: application.tribeTootherreligion,
            living: application.living,
            currentlivingaddress: application.currentlivingaddress,
            motherTongue: application.motherTongue,
            identificationmarks: application.identificationmarks,
            bloodGroup: application.bloodGroup,
            fatherName: application.fatherName,
            motherName: application.motherName,
            fatherOccupation: application.fatherOccupation,
            motherOccupation: application.motherOccupation,
            fatherIncome: application.fatherIncome,
            motherIncome: application.motherIncome,
            address: application.address,
            pincode: application.pincode,
            parentEmail: application.parentEmail,
            guardianName: application.guardianName,
            guardianOccupation: application.guardianOccupation,
            guardianAddress: application.guardianAddress,
            guardianNumber: application.guardianNumber,
            academicHistory: application.academicHistory,
            examYear: application.examYear,
            registrationNumber: application.registrationNumber,
            tamil: application.tamil,
            english: application.english,
            maths: application.maths,
            science: application.science,
            social: application.social,
            total: application.total,
            percentage: application.percentage,
            terminationreason: application.terminationreason,
            photocopyofTC: application.photocopyofTC,
            previousmedium: application.previousmedium,
            preferredmedium: application.preferredmedium,
            bankName: application.bankName,
            branchName: application.branchName,
            accountNumber: application.accountNumber,
            ifsccode: application.ifsccode,
        }, { transaction });

        // 8. Update Applicationhsc — mark Admitted + store section_id + group_subjects
        await application.update(
            {
                studentStatus: "Admitted",
                section_id: Number(section_id),
                group_subjects: normalizedGroupSubjects,
            },
            { transaction }
        );

        await transaction.commit();

        return res.status(200).json({
            message: "Student admitted successfully",
            admissionNumber: newAdmissionNumber
        });

    } catch (error) {
        await transaction.rollback();
        console.error("Error admitting student:", error);
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

controller.getApplicationhscById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Applicationhsc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name", "shortcode", "logo", "address", "city", "state", "pincode", "phoneNumber", "email"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });

        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        // Always return age as a plain object so frontend formatAge works correctly.
        const appJson = application.toJSON();
        let ageToSend = calculateAge(application.dob);
        if (!ageToSend && appJson.age) {
            let stored = appJson.age;
            if (typeof stored === "string") {
                try { stored = JSON.parse(stored); } catch { stored = null; }
                if (typeof stored === "string") { try { stored = JSON.parse(stored); } catch { stored = null; } }
            }
            ageToSend = stored;
        }
        const applicationWithAge = {
            ...appJson,
            age: ageToSend,
        };

        res.json({ application: applicationWithAge });
    } catch (error) {
        console.error("Error fetching application by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateApplicationhsc = async (req, res) => {
    try {
        const { id } = req.params;
        const { emisNum, aadharNumber, academicHistory } = req.body;

        const existing = await Applicationhsc.findByPk(id);
        if (!existing) {
            return res.status(404).json({ error: "Application not found" });
        }

        // Check EMIS number only if changed
        if (emisNum && emisNum !== existing.emisNum) {
            const emisExists = await Applicationhsc.findOne({
                where: {
                    emisNum,
                    school_id: existing.school_id,
                    id: { [Op.ne]: id }
                }
            });
            if (emisExists) {
                return res.status(400).json({ error: "EMIS number already exists for this school" });
            }
        }

        // Check Aadhar number only if changed
        if (aadharNumber && aadharNumber !== existing.aadharNumber) {
            const aadharExists = await Applicationhsc.findOne({
                where: {
                    aadharNumber,
                    school_id: existing.school_id,
                    id: { [Op.ne]: id }
                }
            });
            if (aadharExists) {
                return res.status(400).json({ error: "Aadhar number already exists for this school" });
            }
        }

        // Parse academicHistory if it arrives as a JSON string
        const updateData = { ...req.body };
        if (typeof academicHistory === "string") {
            try { updateData.academicHistory = JSON.parse(academicHistory); } catch { updateData.academicHistory = null; }
        }

        await existing.update(updateData);

        res.status(200).json({
            message: "Application updated successfully",
            application: existing
        });
    } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Soft Delete Application (status → Removed)
controller.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Applicationhsc.findByPk(id);
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
// Fee = ₹250, RLMHSS only.
// Receipt format: RLMHSS/APP-HSC-FC/<academicYear>/<sequence>
// Sequence is per-school per-academicYear and is CONTINUOUS (never resets within same year).
// ─────────────────────────────────────────────────────────────────────────────
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

        // ── Step 1: Fetch plain application (NO includes) for safe update ──
        const application = await Applicationhsc.findByPk(id);
        if (!application) return res.status(404).json({ error: "Application not found" });

        if (application.feeCollected) {
            return res.status(400).json({ error: "Fee already collected for this application" });
        }

        // ── Step 2: Fetch school separately for shortcode ──────────────────
        const school = await School.findByPk(application.school_id, {
            attributes: ["id", "shortcode", "name", "address", "phoneNumber", "email", "logo", "city", "state", "pincode"]
        });
        if (!school) return res.status(404).json({ error: "School not found" });

        const academicYear = application.academicYear;

        // ── Step 3: Count existing paid fees for this school + year ────────
        const existingCount = await Applicationhsc.count({
            where: {
                school_id: application.school_id,
                academicYear: academicYear,
                feeCollected: true
            }
        });

        const sequence = String(existingCount + 1).padStart(4, "0");
        // Receipt format: RLMHSS/APP-HSC-FC/26-27/0001  (short year)
        const shortYear = academicYear.replace(/(\d{2})(\d{2})-(\d{2})(\d{2})/, "$2-$4");
        const receiptNumber = `${school.shortcode}/APP-HSC-FC/${shortYear}/${sequence}`;

        // ── Step 4: Force all values to correct types before saving ────────
        // transactionId must be STRING — cast explicitly to avoid BIGINT truncation
        const txnId = paymentMode === "online"
            ? String(transactionId).trim()   // keep alphanumeric/special chars intact
            : null;

        console.log("[collectFee] Saving:", { receiptNumber, paymentMode, txnId, feeAmount: 250 });

        // ── Step 5: Use raw Sequelize update (bypasses instance-save quirks) ─
        const [rowsUpdated] = await Applicationhsc.update(
            {
                feeCollected: true,
                feeAmount: 250,
                paymentMode: String(paymentMode),
                transactionId: txnId,
                receiptNumber: String(receiptNumber),
                feePaidAt: paymentDate ? new Date(paymentDate) : new Date()
            },
            { where: { id: Number(id) } }
        );

        console.log("[collectFee] Rows updated:", rowsUpdated);

        if (rowsUpdated === 0) {
            return res.status(500).json({ error: "Update failed — no rows affected. Check DB column types." });
        }

        // ── Step 6: Re-fetch with associations for response ─────────────────
        const updated = await Applicationhsc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name", "shortcode", "address", "phoneNumber", "email", "logo", "city", "state", "pincode"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });

        console.log("[collectFee] Saved receiptNumber:", updated.receiptNumber);
        console.log("[collectFee] Saved transactionId:", updated.transactionId);

        return res.status(200).json({
            message: "Fee collected successfully",
            receiptNumber: updated.receiptNumber,
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
        const application = await Applicationhsc.findByPk(id, {
            attributes: ["id", "feeCollected", "receiptNumber", "feeAmount", "paymentMode", "transactionId", "feePaidAt"]
        });
        if (!application) return res.status(404).json({ error: "Application not found" });
        return res.json({ feeStatus: application });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;