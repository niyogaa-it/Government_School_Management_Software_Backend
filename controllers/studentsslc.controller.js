const { Studentsslc, School, Grade, Section } = require("../models");

const controller = {};

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
            nationality,
            state,
            motherTongue,
            religion,
            hometown,
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
        const emisExists = await Studentsslc.findOne({
            where: {
                emisNum,
                school_id
            }
        });
        if (emisExists) {
            return res.status(400).json({ error: "EMIS number already exists for this school" });
        }

        // ✅ Check for duplicate Aadhar number within the same school
        const aadharExists = await Studentsslc.findOne({
            where: {
                aadharNumber,
                school_id
            }
        });
        if (aadharExists) {
            return res.status(400).json({ error: "Aadhar number already exists for this school" });
        }
        // ✅ Get school details
        const school = await School.findByPk(school_id);
        if (!school) return res.status(404).json({ error: "School not found" });



        if (!admissionNumber) {
            const latestAdmission = await Studentsslc.findOne({
                where: { school_id, academicYear },
                order: [['admissionNumber', 'DESC']],
                attributes: ['admissionNumber']
            });

            let nextSequentialNumber = 1;
            if (latestAdmission && latestAdmission.admissionNumber) {
                const lastAdmission = latestAdmission.admissionNumber;
                const numericPart = parseInt(lastAdmission.replace(new RegExp(`^${school.shortcode}`), ''), 10);
                if (!isNaN(numericPart)) {
                    nextSequentialNumber = numericPart + 1;
                }
            }

            const paddedNumber = String(nextSequentialNumber).padStart(4, '0');
            admissionNumber = `${school.shortcode}${paddedNumber}`;
        }

        // ✅ Generate application number
        const count = await Studentsslc.count({
            where: {
                school_id,
                academicYear: academicYear
            }
        });
        const sequence = String(count + 1).padStart(4, '0');
        const applicationNumber = `${school.shortcode}/APP/${academicYear}/${sequence}`;
        const parsedAge = typeof age === 'string' ? JSON.parse(age) : age;
        // Create application
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
            passorfail,
            tceslc,
            firstLanguage,
            bankName,
            branchName,
            accountNumber,
            ifsccode,
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

controller.getAllStudentsslc = async (req, res) => {
    try {
        const studentsslcs = await Studentsslc.findAll({
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, attributes: ["id", "sectionName"] }
            ]
        });

        return res.json({ studentsslcs });
    } catch (error) {
        console.error("Error fetching studentsslcs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudentsslcsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID required" });

        const studentsslcs = await Studentsslc.findAll({
            where: { school_id },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, attributes: ["id", "sectionName"] }
            ],
            attributes: {
                exclude: [] // include all fields
            }
        });

        res.status(200).json({ studentsslcs });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({
            error: "Internal error",
            details: error.message
        });
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

controller.getStudentsslcById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Studentsslc.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] },
                { model: Section, attributes: ["id", "sectionName"] }
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

controller.updateStudentsslc = async (req, res) => {
    try {
        const { id } = req.params;
        const existingStudent = await Studentsslc.findByPk(id);

        if (!existingStudent) {
            return res.status(404).json({ error: "Application not found" });
        }

        // ✅ Prepare update data
        const updatedData = { ...req.body };

        // ✅ Convert age object to string if necessary
        if (typeof updatedData.age === 'object' && updatedData.age !== null) {
            const { years = 0, months = 0, days = 0 } = updatedData.age;
            updatedData.age = `${years}y ${months}m ${days}d`;
        }

        // ✅ Perform the update
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


module.exports = controller;