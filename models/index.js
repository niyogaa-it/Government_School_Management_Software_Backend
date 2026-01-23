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


// ✅ Define relationships
School.hasMany(Role, { foreignKey: "school_id" });
Role.belongsTo(School, { foreignKey: "school_id" });

Admin.belongsTo(School, { foreignKey: "school_id" });
Admin.belongsTo(Role, { foreignKey: "role_id" });

Grade.belongsTo(School, { foreignKey: "school_id" });

Section.belongsTo(School, { foreignKey: "school_id" });
Section.belongsTo(Grade, { foreignKey: "grade_id" });

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

module.exports = { Admin, Role, School, Grade, Section, Applicationsslc, Applicationhsc, 
    Group, Studentsslc, Subject, Studenthsc, SidebarPermission };
