const { Studenthsc, School, Grade } = require("../models");

const controller = {};

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
            dob,           // ✅ ADDED dob
            age,           // ✅ Already present
            nationality,
            state,
            birthdistrict,
            community,
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

        // ✅ Check for duplicate EMIS number within the same school
        const emisExists = await Studenthsc.findOne({
            where: {
                emisNum,
                school_id
            }
        });
        if (emisExists) {
            return res.status(400).json({ error: "EMIS number already exists for this school" });
        }

        // ✅ Check for duplicate Aadhar number within the same school
        const aadharExists = await Studenthsc.findOne({
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
        const latestAdmission = await Studenthsc.findOne({
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
       const count = await Studenthsc.count({
           where: {
               school_id,
               academicYear: academicYear
           }
       });
       const sequence = String(count + 1).padStart(4, '0');
       const applicationNumber = `${school.shortcode}/APP/${academicYear}/${sequence}`;

        // Create application
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
            dob,         
            age,           
            nationality,
            state,
            birthdistrict,
            community,
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
            status: "active",
        });

        return res.status(201).json({
            message: "Application created successfully",
            application: newStudenthsc
        });
    } catch (error) {
        console.error("Error creating application:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllStudenthsc = async (req, res) => {
    try {
        const studenthscs = await Studenthsc.findAll({
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] } // ✅ Add this to include Grade
            ]
        });
        
        return res.json({ studenthscs });
    } catch (error) {
        console.error("Error fetching studenthscs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getStudenthscsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) return res.status(400).json({ message: "School ID required" });

        const studenthscs = await Studenthsc.findAll({
            where: { school_id },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ],
            attributes: {
                exclude: [] // include all fields
            }
        });

        res.status(200).json({ studenthscs });
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

controller.getStudenthscById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Studenthsc.findByPk(id, {
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

controller.updateStudenthsc = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Studenthsc.findByPk(id);
    if (!existing) {
      return res.status(404).json({ error: "Student not found" });
    }

    const updatedData = { ...req.body };

    // ✅ Convert age object to string if needed
    if (typeof updatedData.age === 'object' && updatedData.age !== null) {
      const { years = 0, months = 0, days = 0 } = updatedData.age;
      updatedData.age = `${years}y ${months}m ${days}d`;
    }

    await existing.update(updatedData);

    res.status(200).json({
      message: "Student updated successfully",
      application: existing
    });
  } catch (error) {
    console.error("Error updating studenthsc:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = controller;