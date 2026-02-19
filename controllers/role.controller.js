const { Role, School } = require("../models");
const { Op } = require("sequelize");
const controller = {};

// Create a new role
controller.createRole = async (req, res) => {
    try {
        const { roleOfUser, school_id } = req.body;

        const schoolExists = await School.findByPk(school_id);
        if (!schoolExists) {
            return res.status(404).json({ error: "School not found" });
        }

        const existingRole = await Role.findOne({
            where: {
                school_id,
                roleOfUser: roleOfUser
            },
        });

        if (existingRole) {
            return res.status(400).json({ error: "This role already exists in this school." });
        }

        const role = await Role.create({
            roleOfUser,   // ✅ NO lowercase conversion
            school_id,
        });

        return res.status(201).json({
            message: "Role created successfully",
            role
        });

    } catch (error) {
        console.error("Error creating role:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Get all roles with school details
controller.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll({
            where: { status: 1 },
            include: {
                model: School,
                attributes: ["id", "name"], //  Include school details
            },
        });
        return res.json({ roles });  //  Ensure response has `{ roles: [...] }`
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

//  Get roles based on school ID
controller.getRolesBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id) {
            return res.status(400).json({ message: "School ID is required." });
        }

        // Fetch roles where `school_id` matches
        const roles = await Role.findAll({
            where: { school_id, status: 1 },
            attributes: ["id", "roleOfUser"],
        });

        return res.status(200).json({ roles });

        res.status(200).json({ roles });
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await Role.findByPk(id);
        if (!role) {
            return res.status(404).json({ error: "Role not found" });
        }

        await role.update({ status: 0 }); // Assuming 'status' field exists for soft delete

        return res.status(200).json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
        console.error("Error deleting role:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;
