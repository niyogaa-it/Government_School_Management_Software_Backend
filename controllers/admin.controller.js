const { Admin, Role, School } = require("../models");

const controller = {};

// ? Get all admins with Role & School information
controller.getAllAdmin = async (req, res) => {
    try {
        const admins = await Admin.findAll({
            include: [
                { model: Role, attributes: ["id", "roleOfUser"] },  // Include Role details
                { model: School, attributes: ["id", "name"] }       // Include School details
            ],
        });

        return res.status(200).json({ admins });
    } catch (error) {
        console.error("Error fetching admins:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAdminsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        if (!school_id || isNaN(school_id)) {
            return res.status(400).json({ message: "Valid School ID is required." });
        }

        const admins = await Admin.findAll({
            where: { school_id, status: 1 },
            include: [
                { model: Role, attributes: ["id", "roleOfUser"] },
                { model: School, attributes: ["id", "name"] }
            ],
        });

        if (!admins.length) {
            return res.status(404).json({ message: "No admins found for this school." });
        }

        return res.status(200).json({ admins });
    } catch (error) {
        console.error("Error fetching admins:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ? Create a new admin with email uniqueness check
controller.createAdmin = async (req, res) => {
    try {
        const { name, school_id, mobileNumber, email, password, role_id } = req.body;

        // Check if an admin with the same email already exists
        const existingEmail = await Admin.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(409).json({ error: "User with the same email already exists" });
        }

        // Create new admin
        const admin = await Admin.create({
            name, school_id, mobileNumber, email, password, role_id
        });

        return res.status(201).json({
            success: true,
            message: "Successfully created User",
            admin,
        });
    } catch (error) {
        console.error("Error creating User:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findByPk(id, {
      include: [
        { model: Role, attributes: ["id", "roleOfUser"] },
        { model: School, attributes: ["id", "name"] }
      ]
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    return res.status(200).json({ admin });
  } catch (error) {
    console.error("Error fetching admin by ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ? Admin login function (No Hash Password, No JWT)
controller.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if admin exists with the provided email and password
        const admin = await Admin.findOne({
            where: { email, password },
            include: [
                { model: Role, attributes: ["id", "roleOfUser"] },
                { model: School, attributes: ["id", "name"] }
            ],
        });

        if (!admin) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Extract relevant data and include roleName
        const plainAdmin = admin.get({ plain: true });
        const userData = {
            ...plainAdmin,
            roleName: plainAdmin.Role.roleOfUser, // Map roleOfUser to roleName
            school: plainAdmin.School
        };

        // Return the admin data with role and school
        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: userData // ? Include user data here
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};

// ? Soft delete admin by setting status to 0
controller.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const admin = await Admin.findByPk(id);
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        await admin.update({ status: 0 }); // Soft delete

        return res.status(200).json({
            success: true,
            message: "Admin deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting admin:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ? Update admin by ID
controller.updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobileNumber, password, role_id } = req.body;

        const admin = await Admin.findByPk(id);
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        await admin.update({ name, email, mobileNumber, password, role_id });

        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            admin
        });
    } catch (error) {
        console.error("Error updating admin:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;
