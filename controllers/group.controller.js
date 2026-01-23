const { Group, School, Grade, Section, Studenthsc } = require("../models");

const controller = {};

controller.createGroup = async (req, res) => {
    try {
        const { school_id, grade_id, availableGroups } = req.body;

        // Validate school and grade existence
        const schoolExists = await School.findByPk(school_id);
        const gradeExists = await Grade.findByPk(grade_id);

        if (!schoolExists || !gradeExists) {
            return res.status(404).json({ error: "School or Grade not found" });
        }

        // ✅ Check if group already exists in the same school & grade
        const existingGroup = await Group.findOne({
            where: {
                school_id,
                grade_id,
                availableGroups: availableGroups.toLowerCase()
            }
        });

        if (existingGroup) {
            return res.status(400).json({ error: "This group already exists for the selected grade." });
        }

        // Create group
        const newGroup = await Group.create({
            school_id,
            grade_id,
            availableGroups: availableGroups.toLowerCase()
        });

        return res.status(201).json({
            message: "Group created successfully",
            group: newGroup
        });
    } catch (error) {
        console.error("Error creating Group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllGroups = async (req, res) => {
    try {
        const groups = await Group.findAll({
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });
        return res.json({ groups });
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getGroupsBySchool = async (req, res) => {
    const school_id = req.params.school_id;
    try {
        const groups = await Group.findAll({
            where: {
                school_id,
                isActive: true
            },
            include: [{ model: Grade, attributes: ["id", "grade"] }]
        });
        res.status(200).json({ groups });
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ error: "Failed to fetch groups" });
    }
};

controller.getGroupsByGrade = async (req, res) => {
    try {
        const { grade_id } = req.params;
        if (!grade_id) {
            return res.status(400).json({ message: "Grade ID is required" });
        }

        const groups = await Group.findAll({
            where: { grade_id, status: true },
            attributes: ["id", "availableGroups"]
        });

        res.status(200).json({ groups });
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteGroup = async (req, res) => {
    const { id } = req.params;
    try {
        const group = await Group.findByPk(id);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        group.isActive = false;
        await group.save();

        res.json({ message: "Group soft-deleted successfully" });
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { availableGroups } = req.body;

        const group = await Group.findByPk(id);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // Check for duplicate group name in same grade
        const existingGroup = await Group.findOne({
            where: {
                school_id: group.school_id,
                grade_id: group.grade_id,
                availableGroups: availableGroups.toLowerCase(),
                id: { [Op.ne]: id } // Exclude current group
            }
        });

        if (existingGroup) {
            return res.status(400).json({ error: "This group already exists for the selected grade." });
        }

        // Update group
        group.availableGroups = availableGroups.toLowerCase();
        await group.save();

        return res.json({
            message: "Group updated successfully",
            group
        });
    } catch (error) {
        console.error("Error updating Group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Add this controller for viewing group details
controller.getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await Group.findByPk(id, {
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] }
            ]
        });

        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        return res.json({ group });
    } catch (error) {
        console.error("Error fetching group:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// controller.getGroupsBySchoolAndGrade = async (req, res) => {
//     try {
//         const schoolId = parseInt(req.params.school_id, 10);
//         const gradeId = parseInt(req.params.grade_id, 10);

//         if (!school_id || !grade_id) {
//             return res.status(400).json({ error: "School ID and Grade ID are required." });
//         }

//         if (!schoolId || !gradeId) {
//             return res.status(400).json({ error: "School ID and Grade ID are required." });
//         }

//         const groups = await Group.findAll({
//             where: {
//                 school_id: schoolId,
//                 grade_id: gradeId,
//                 isActive: true
//             },
//             attributes: ["id", "availableGroups"]
//         });

//         console.log("Groups found:", groups.length);

//         if (!groups.length) {
//             return res.status(200).json({ groups });
//         }

//         res.status(200).json({ groups });
//     } catch (error) {
//         console.error("Error fetching groups by school and grade:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };

module.exports = controller;