// ─────────────────────────────────────────────────────────────────────────────
// ADMIT STUDENT
// Converts an Applicationsslc record into a Studentsslc record.
// Accepts section_id from req.body (selected in the admit popup).
//
// Route: POST /applicationsslc/admit/:applicationId
// Body:  { section_id: Number }
//
// On success:
//   1. Applicationsslc.studentStatus  → "Admitted"   (disappears from frontend list)
//   2. New row created in Studentsslc  (appears in student list)
// ─────────────────────────────────────────────────────────────────────────────

const { Applicationsslc } = require("../models/applicationsslc");   
const { Studentsslc }     = require("../models/studentsslc");       
const School              = require("../models/school");    
const Section             = require("../models/section");            
const sequelize           = require("../config/database");

controller.admitStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { applicationId } = req.params;
    const { section_id }    = req.body;

    if (!section_id) {
      await transaction.rollback();
      return res.status(400).json({ error: "section_id is required" });
    }

    /* ── 1. Load application ── */
    const application = await Applicationsslc.findByPk(applicationId, { transaction });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ error: "Application not found" });
    }
    if (application.studentStatus !== "Applied") {
      await transaction.rollback();
      return res.status(400).json({ error: "Student has already been admitted or removed" });
    }

    /* ── 2. Generate admission number  (same format as createStudentsslc) ── */
    const school = await School.findByPk(application.school_id, { transaction });
    if (!school) {
      await transaction.rollback();
      return res.status(404).json({ error: "School not found" });
    }

    const latestAdmission = await Studentsslc.findOne({
      where:      { school_id: application.school_id },
      order:      [["id", "DESC"]],
      attributes: ["admissionNumber"],
      transaction,
    });

    let nextSeq = 1;
    if (latestAdmission?.admissionNumber) {
      const match = latestAdmission.admissionNumber.match(/(\d{4})$/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }
    const admissionNumber = `${school.shortcode}SSLC${String(nextSeq).padStart(4, "0")}`;

    /* ── 3. Parse JSON fields ── */
    const parsedAge = typeof application.age === "string"
      ? JSON.parse(application.age)
      : application.age;

    const parsedHistory = typeof application.academicHistory === "string"
      ? JSON.parse(application.academicHistory)
      : application.academicHistory;

    /* ── 4. Create Studentsslc row (all fields from application) ── */
    const student = await Studentsslc.create(
      {
        admissionNumber,
        academicYear:        application.academicYear,
        dateofjoin:          new Date(),
        school_id:           application.school_id,
        grade_id:            application.grade_id,
        section_id:          Number(section_id),     
        emisNum:             application.emisNum,
        aadharNumber:        application.aadharNumber,
        name:                application.name,
        gender:              application.gender,
        dob:                 application.dob,
        age:                 parsedAge,
        nationality:         application.nationality,
        state:               application.state,
        motherTongue:        application.motherTongue,
        hometown:            application.hometown,
        religion:            application.religion,
        community:           application.community,
        caste:               application.caste,
        tribecommunity:      application.tribecommunity,
        exgratiasalary:      application.exgratiasalary,
        religionchanging:    application.religionchanging,
        living:              application.living,
        vaccinated:          application.vaccinated,
        identificationmarks: application.identificationmarks,
        bloodGroup:          application.bloodGroup,
        physical:            application.physical,
        physicalDetails:     application.physicalDetails,
        fatherName:          application.fatherName,
        motherName:          application.motherName,
        fatherOccupation:    application.fatherOccupation,
        motherOccupation:    application.motherOccupation,
        fatherIncome:        application.fatherIncome,
        motherIncome:        application.motherIncome,
        address:             application.address,
        pincode:             application.pincode,
        telephoneNumber:     application.telephoneNumber,
        mobileNumber:        application.mobileNumber,
        guardianName:        application.guardianName,
        guardianOccupation:  application.guardianOccupation,
        guardianAddress:     application.guardianAddress,
        guardianNumber:      application.guardianNumber,
        academicHistory:     parsedHistory,
        parentconsentform:   application.parentconsentform,
        passorfail:          application.passorfail,
        tceslc:              application.tceslc,
        medium:              application.medium,
        bankName:            application.bankName,
        branchName:          application.branchName,
        accountNumber:       application.accountNumber,
        ifsccode:            application.ifsccode,
        studentType:         "new",
        status:              "active",
      },
      { transaction }
    );

    /* ── 5. Mark application as Admitted (disappears from the applied list) ── */
    await application.update({ studentStatus: "Admitted" }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      message:         "Student admitted successfully",
      admissionNumber: student.admissionNumber,
      studentId:       student.id,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("admitStudent error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
