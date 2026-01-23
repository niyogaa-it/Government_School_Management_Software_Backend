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
            dob,           // ✅ ADDED dob
            age,           // ✅ Already present
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
            academicHistory,
            parentconsentform,
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
        const applicationNumber = `${school.shortcode}/APP/${academicYear}/${sequence}`;

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
            dob,               // ✅ Save DOB to DB
            age,               // ✅ Save Age to DB
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
            academicHistory,
            parentconsentform,
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
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] } // ✅ ADD THIS
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
            where: { school_id },
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

        const school = await School.findByPk(application.school_id);
        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }

        const shortcode = school.shortcode;

        const lastStudent = await Studentsslc.findOne({
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

        await Studentsslc.create({
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

module.exports = controller;