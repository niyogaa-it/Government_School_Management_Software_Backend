const { Applicationhsc, School, Grade, Studenthsc } = require("../models");

const controller = {};

const { Op } = require("sequelize");

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
            dob,           // ✅ ADDED dob
            age,           // ✅ Already present
            nationality,
            state,
            birthdistrict,
            community,
            identificationmarks,
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
            telephoneNumber,
            mobileNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            examYear, 
            registrationnumber, 
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
        const applicationNumber = `${school.shortcode}/APP/${academicYear}/${sequence}`;

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
            dob,           // ✅ ADDED dob
            age,           // ✅ Already present
            nationality,
            state,
            birthdistrict,
            community,
            identificationmarks,
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
            telephoneNumber,
            mobileNumber,
            guardianName,
            guardianOccupation,
            guardianAddress,
            guardianNumber,
            examYear, 
            registrationnumber, 
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
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] } // ✅ Add this to include Grade
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
            where: { school_id },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: {
                exclude: [] // include all fields
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

// Admit Student
controller.admitStudent = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await Applicationhsc.findByPk(applicationId);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        const school = await School.findByPk(application.school_id);
        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }

        const shortcode = school.shortcode;

        const lastStudent = await Studenthsc.findOne({
            where: { school_id: application.school_id },
            order: [['id', 'DESC']]
        });

        let nextNumber = 1;
        if (lastStudent && lastStudent.admissionNumber) {
            const lastNum = parseInt(lastStudent.admissionNumber.replace(shortcode, ""));
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
        }

        const newAdmissionNumber = `${shortcode}${String(nextNumber).padStart(4, '0')}`;

        application.studentStatus = "Admitted";
        await application.save();

        await Studenthsc.create({
            school_id: application.school_id,
            academicYear: application.academicYear,
            name: application.name,
            gender: application.gender,
            grade_id: application.grade_id,
            admissionNumber: newAdmissionNumber,
            dateofjoin: new Date(),
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

controller.getApplicationhscById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Applicationhsc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
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
        console.error("Error fetching application by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateApplicationhsc = async (req, res) => {
    try {
        const { id } = req.params;
        const { emisNum, aadharNumber } = req.body;

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

        await existing.update(req.body);

        res.status(200).json({
            message: "Application updated successfully",
            application: existing
        });
    } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;