const { Admin, Role, School } = require("../models");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

const controller = {};

// ✅ Get all admins with Role & School information
controller.getAllAdmin = async (req, res) => {
    try {
        const admins = await Admin.findAll({
            where: { status: 1 },
            include: [
                { model: Role, attributes: ["id", "roleOfUser"] },
                { model: School, attributes: ["id", "name"] }
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

// ✅ Create a new admin with email uniqueness check
controller.createAdmin = async (req, res) => {
    try {
        const { name, school_id, mobileNumber, email, password, role_id } = req.body;
        const existingEmail = await Admin.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(409).json({ error: "User with the same email already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const admin = await Admin.create({
            name, school_id, mobileNumber, email, password: hashedPassword, role_id
        });
        return res.status(201).json({ success: true, message: "Successfully created User", admin });
    } catch (error) {
        console.error("Error creating User:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAdminById = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findOne({
            where: { id, status: 1 },
            include: [
                { model: Role, attributes: ["id", "roleOfUser"] },
                { model: School, attributes: ["id", "name"] }
            ]
        });
        if (!admin) return res.status(404).json({ error: "Admin not found" });
        return res.status(200).json({ admin });
    } catch (error) {
        console.error("Error fetching admin by ID:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Admin login — never returns password hash to client
controller.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({
            where: { email, status: 1 },
            include: [
                { model: Role, attributes: ["id", "roleOfUser"] },
                { model: School, attributes: ["id", "name"] }
            ],
        });
        if (!admin) return res.status(401).json({ error: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        const plainAdmin = admin.get({ plain: true });
        const userData = {
            ...plainAdmin,
            roleName: plainAdmin.Role.roleOfUser,
            school: plainAdmin.School
        };
        delete userData.password; // ✅ Never send hash to client

        return res.status(200).json({ success: true, message: "Login successful", user: userData });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};

// ✅ Soft delete — sets status to 0
controller.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findByPk(id);
        if (!admin) return res.status(404).json({ error: "Admin not found" });
        await admin.update({ status: 0 });
        return res.status(200).json({ success: true, message: "Admin deleted successfully" });
    } catch (error) {
        console.error("Error deleting admin:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Update admin — password intentionally excluded
controller.updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobileNumber, role_id } = req.body;
        const admin = await Admin.findByPk(id);
        if (!admin) return res.status(404).json({ error: "Admin not found" });
        await admin.update({ name, email, mobileNumber, role_id });
        return res.status(200).json({ success: true, message: "Admin updated successfully", admin });
    } catch (error) {
        console.error("Error updating admin:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Change password — logged-in user changes their OWN password
//    Requires current password verification before allowing update
controller.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }
        if (newPassword.trim().length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters" });
        }

        const admin = await Admin.findByPk(id);
        if (!admin) return res.status(404).json({ error: "User not found" });

        // ✅ Verify current password first
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // ✅ Prevent reusing the same password
        const isSame = await bcrypt.compare(newPassword.trim(), admin.password);
        if (isSame) {
            return res.status(400).json({ error: "New password must be different from your current password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword.trim(), SALT_ROUNDS);
        await admin.update({ password: hashedPassword });

        return res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Reset password — superadmin only, no current password required
controller.resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const admin = await Admin.findByPk(id);
        if (!admin) return res.status(404).json({ error: "Admin not found" });

        const hashedPassword = await bcrypt.hash(newPassword.trim(), SALT_ROUNDS);
        await admin.update({ password: hashedPassword });

        return res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Error resetting password:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;