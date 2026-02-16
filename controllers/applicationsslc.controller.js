const { Applicationsslc, School, Grade, Studentsslc } = require("../models");

const controller = {};
const { Op } = require("sequelize");


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
            dob,
            age,
            nationality,
            state,
            motherTongue,
            hometown,
            religion,
            community,
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
            telephoneNumber,
            mobileNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            parentconsentform,
            academicHistory,
            passorfail,
            tceslc,
            firstLanguage,
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

        // ✅ Check for duplicate EMIS number within the same school
        const emisExists = await Applicationsslc.findOne({
            where: {
                emisNum,
                school_id
            }
        });
        if (emisExists) {
            return res.status(400).json({ error: "EMIS number already exists for this school" });
        }

        // ✅ Check for duplicate Aadhar number within the same school
        const aadharExists = await Applicationsslc.findOne({
            where: {
                aadharNumber,
                school_id
            }
        });
        if (aadharExists) {
            return res.status(400).json({ error: "Aadhar number already exists for this school" });
        }

        // Get school details with shortcode
        const school = await School.findByPk(school_id);
        if (!school) return res.status(404).json({ error: "School not found" });

        // Generate application number
        const count = await Applicationsslc.count({
            where: {
                school_id,
                academicYear: academicYear
            }
        });

        const sequence = String(count + 1).padStart(4, '0');
        const applicationNumber = `${school.shortcode}/APP-SSLC/${academicYear}/${sequence}`;

        // Create application
        const newApplicationsslc = await Applicationsslc.create({
            school_id,
            academicYear,
            applicationNumber,
            emisNum,
            aadharNumber,
            name,
            gender,
            grade_id,
            dob,
            age,
            nationality,
            state,
            motherTongue,
            hometown,
            religion,
            community,
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
            telephoneNumber,
            mobileNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            parentconsentform,
            academicHistory,
            passorfail,
            tceslc,
            firstLanguage,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
            studentStatus: "Applied",
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
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
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
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: {
                exclude: [] // include all fields
            }
        });

        res.status(200).json({ applicationsslcs });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({
            error: "Internal error",
            details: error.message
        });
    }
};


// Admit Student
controller.admitStudent = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await Applicationsslc.findByPk(applicationId);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        if (application.studentStatus === "Admitted") {
            return res.status(400).json({ error: "Student already admitted" });
        }

        const school = await School.findByPk(application.school_id);
        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }

        const prefix = `${school.shortcode}SSLC`;

        // STEP 1: Find last admission number for this school
        const lastStudent = await Studentsslc.findOne({
            where: {
                school_id: application.school_id,
                admissionNumber: {
                    [Op.like]: `${prefix}%`
                }
            },
            order: [['admissionNumber', 'DESC']],
            attributes: ['admissionNumber']
        });

        // STEP 2: Extract last sequence
        let nextSeq = 1;
        if (lastStudent?.admissionNumber) {
            const match = lastStudent.admissionNumber.match(/(\d{4})$/);
            if (match) {
                nextSeq = parseInt(match[1], 10) + 1;
            }
        }

        // STEP 3: Generate new admission number
        const newAdmissionNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

        // STEP 4: Update application status
        await application.update({ studentStatus: "Admitted" });

        // STEP 5: Insert into Studentsslc
        await Studentsslc.create({
            school_id: application.school_id,
            academicYear: application.academicYear,
            name: application.name,
            gender: application.gender,
            grade_id: application.grade_id,
            admissionNumber: newAdmissionNumber,
            dateofjoin: new Date(),
            status: "active",

            // 🔹 Student basic info
            emisNum: application.emisNum,
            aadharNumber: application.aadharNumber,
            name: application.name,
            gender: application.gender,
            grade_id: application.grade_id,
            dob: application.dob,
            age: application.age,
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

            // 🔹 Parent / Guardian details
            fatherName: application.fatherName,
            motherName: application.motherName,
            fatherOccupation: application.fatherOccupation,
            motherOccupation: application.motherOccupation,
            fatherIncome: application.fatherIncome,
            motherIncome: application.motherIncome,
            guardianName: application.guardianName,
            guardianOccupation: application.guardianOccupation,
            guardianAddress: application.guardianAddress,
            guardianNumber: application.guardianNumber,

            // 🔹 Contact details
            address: application.address,
            pincode: application.pincode,
            telephoneNumber: application.telephoneNumber,
            mobileNumber: application.mobileNumber,

            // 🔹 Academic & documents
            academicHistory:
                typeof application.academicHistory === "string"
                    ? JSON.parse(application.academicHistory)
                    : application.academicHistory,
            parentconsentform: application.parentconsentform,
            passorfail: application.passorfail,
            tceslc: application.tceslc,
            firstLanguage: application.firstLanguage,

            // 🔹 Bank details
            bankName: application.bankName,
            branchName: application.branchName,
            accountNumber: application.accountNumber,
            ifsccode: application.ifsccode
        });

        return res.json({
            message: "Student admitted successfully",
            admissionNumber: newAdmissionNumber
        });

    } catch (error) {
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
        const applicationWithAge = {
            ...application.toJSON(),
            age
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
        const {
            emisNum,
            aadharNumber
        } = req.body;

        const existingApp = await Applicationsslc.findByPk(id);
        if (!existingApp) {
            return res.status(404).json({ error: "Application not found" });
        }

        // Check for duplicate EMIS number only if it's changed
        if (emisNum && emisNum !== existingApp.emisNum) {
            const emisExists = await Applicationsslc.findOne({
                where: {
                    emisNum,
                    school_id: existingApp.school_id,
                    id: { [Op.ne]: id } // exclude current application
                }
            });
            if (emisExists) {
                return res.status(400).json({ error: "EMIS number already exists for this school" });
            }
        }

        // Check for duplicate Aadhar number only if it's changed
        if (aadharNumber && aadharNumber !== existingApp.aadharNumber) {
            const aadharExists = await Applicationsslc.findOne({
                where: {
                    aadharNumber,
                    school_id: existingApp.school_id,
                    id: { [Op.ne]: id } // exclude current application
                }
            });
            if (aadharExists) {
                return res.status(400).json({ error: "Aadhar number already exists for this school" });
            }
        }

        // Perform the update
        await existingApp.update(req.body);

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

module.exports = controller;