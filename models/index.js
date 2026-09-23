const Admin = require("./admin");
const Role = require("./role");
const School = require("./school");
const Grade = require("./grade");
const Section = require("./section");
const Applicationsslc = require("./applicationsslc");
const Applicationhsc = require("./applicationhsc");
const Group = require("./group");
const Studentsslc = require("./studentsslc");
const Subject = require("./Subject");
const Studenthsc = require("./studenthsc");
const SidebarPermission = require("./sidebarpermission");
const FeeCollection = require("./Feecollection");
const Tc = require("./tc");
const Tchsc = require("./tchsc"); 
const Instructor = require("./instructor");
const InstructorSubject = require("./instructorsubject");
const SectionSubject = require("./sectionSubject");
const SectionSubjectTeacher = require("./section_subject_teacher");
const TimeSet = require("./timeSet");
const TimeSlot = require("./timeSlot");
const TimeSetSection = require("./timeSetSection");
const WeekDaySlot = require("./weekDaySlot");
const WeekDaySchedule = require("./weekDaySchedule");
const TimeTable = require("./timeTable");
const TimeTableEntry = require("./timeTableEntry");

//  Define relationships
School.hasMany(Role, { foreignKey: "school_id" });
Role.belongsTo(School, { foreignKey: "school_id" });

Admin.belongsTo(School, { foreignKey: "school_id" });
Admin.belongsTo(Role, { foreignKey: "role_id" });

Grade.belongsTo(School, { foreignKey: "school_id" });

Section.belongsTo(School, { foreignKey: "school_id" });
Section.belongsTo(Grade, { foreignKey: "grade_id" });
Section.hasMany(SectionSubject, { as: "Subjects", foreignKey: "section_id" });
SectionSubject.belongsTo(Subject, { foreignKey: "subject_id" });
Section.belongsTo(Instructor, { as: "ClassTeacher", foreignKey: "class_teacher_id" });

Applicationsslc.belongsTo(School, { foreignKey: "school_id" });
Applicationsslc.belongsTo(Grade, { foreignKey: "grade_id" });

Applicationhsc.belongsTo(School, { foreignKey: "school_id" });
Applicationhsc.belongsTo(Grade, { foreignKey: "grade_id" });

Group.belongsTo(School, { foreignKey: "school_id" });
Group.belongsTo(Grade, { foreignKey: "grade_id" });

Studentsslc.belongsTo(School, { foreignKey: "school_id" });
Studentsslc.belongsTo(Grade, { foreignKey: "grade_id" });
Studentsslc.belongsTo(Section, { foreignKey: "section_id" });

Subject.belongsTo(School, { foreignKey: "school_id" });
Subject.belongsTo(Grade, { foreignKey: "grade_id" });
Subject.belongsTo(Section, { foreignKey: "section_id" });

Studenthsc.belongsTo(School, { foreignKey: "school_id" });
Studenthsc.belongsTo(Grade, { foreignKey: "grade_id" });
Studenthsc.belongsTo(Section, { foreignKey: "section_id" });
Studenthsc.belongsTo(Group, { foreignKey: "group_id" });

SidebarPermission.belongsTo(Role, { foreignKey: "role_id" });

FeeCollection.belongsTo(School, { foreignKey: "school_id" });
FeeCollection.belongsTo(Studentsslc, { foreignKey: "student_id", constraints: false });

Tc.belongsTo(School,       { foreignKey: "school_id" });
Tc.belongsTo(Studentsslc,  { foreignKey: "studentsslc_id" });

Tchsc.belongsTo(School,     { foreignKey: "school_id" });
Tchsc.belongsTo(Studenthsc, { foreignKey: "studenthsc_id" });

// ── Instructor ───────────────────────────────────────────────
// Class Teacher assignment has been removed from Instructor entirely
// (no field, no association) — an instructor is just linked to a School
// and to the grade/subject rows they teach via InstructorSubject.
Instructor.belongsTo(School, { foreignKey: "school_id" });

InstructorSubject.belongsTo(Instructor, { foreignKey: "instructor_id" });
InstructorSubject.belongsTo(Grade, { foreignKey: "grade_id" });
InstructorSubject.belongsTo(Subject, { foreignKey: "subject_id" });

Instructor.hasMany(InstructorSubject, { foreignKey: "instructor_id", as: "Subjects" });

SectionSubject.hasMany(SectionSubjectTeacher, { as: "Teachers", foreignKey: "section_subject_id" });
SectionSubjectTeacher.belongsTo(SectionSubject, { foreignKey: "section_subject_id" });

SectionSubjectTeacher.belongsTo(Instructor, { as: "Instructor", foreignKey: "instructor_id" });
Instructor.hasMany(SectionSubjectTeacher, { foreignKey: "instructor_id" });

TimeSet.belongsTo(School, { foreignKey: "school_id" });
TimeSetSection.belongsTo(TimeSet, { foreignKey: "time_set_id" });
TimeSetSection.belongsTo(Section, { foreignKey: "section_id" });
TimeSet.hasMany(TimeSetSection, { foreignKey: "time_set_id" });
Section.hasMany(TimeSetSection, { foreignKey: "section_id" });
TimeSlot.belongsTo(TimeSet, { foreignKey: "time_set_id" });
TimeSet.hasMany(TimeSlot, { foreignKey: "time_set_id" });

WeekDaySchedule.belongsTo(School, { foreignKey: "school_id" });
WeekDaySchedule.belongsTo(Grade, { foreignKey: "grade_id" });
WeekDaySchedule.belongsTo(Section, { foreignKey: "section_id" });

WeekDaySlot.belongsTo(WeekDaySchedule, { foreignKey: "week_day_schedule_id" });
WeekDaySlot.belongsTo(TimeSet, { foreignKey: "time_set_id" });
WeekDaySchedule.hasMany(WeekDaySlot, { foreignKey: "week_day_schedule_id" });

TimeTable.belongsTo(School, { foreignKey: "school_id" });
TimeTableEntry.belongsTo(TimeTable, { foreignKey: "time_table_id" });
TimeTableEntry.belongsTo(Section, { foreignKey: "section_id" });
TimeTableEntry.belongsTo(Subject, { foreignKey: "subject_id" });
TimeTableEntry.belongsTo(Instructor, { foreignKey: "instructor_id" });
TimeTableEntry.belongsTo(TimeSlot, { foreignKey: "time_slot_id" });
TimeTable.hasMany(TimeTableEntry, { foreignKey: "time_table_id" });

module.exports = {
    Admin, Role, School, Grade, Section, Applicationsslc, Applicationhsc, InstructorSubject, SectionSubject,
    Group, Studentsslc, Subject, Studenthsc, SidebarPermission, FeeCollection, Tc, Tchsc, Instructor,
    SectionSubjectTeacher, TimeSet, TimeSlot, TimeSetSection, WeekDaySlot, WeekDaySchedule,  TimeTable, TimeTableEntry
};