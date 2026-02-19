const { School } = require("../models");

const controller = {};


controller.getAllSchools = async (req, res) => {
    try {
        // ✅ Removed superadmin check
        const schools = await School.findAll({
            where: { status: 1 }, // Optional: if soft-delete logic is used
            attributes: ["id", "name", "shortcode", "phoneNumber", "address", "city", "state", "pincode"],
        });
        
        return res.json({ schools });
    } catch (error) {
        console.error("Error fetching schools:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


// ✅ Create school (Only if authorized)
controller.createSchool = async (req, res) => {
    try {
        const { name, shortcode, phoneNumber, address, city, pincode, state } = req.body;

        // 🔒 Check for required fields
        if (!name || !shortcode || !address || !city || !pincode || !state) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // ❗ Check for duplicate school name
        const existingSchool = await School.findOne({ where: { name } });
        if (existingSchool) {
            return res.status(409).json({ error: "School with the same name already exists" });
        }

        // ✅ Create the school
        const school = await School.create({
            name,
            shortcode,
            phoneNumber,
            address,
            city,
            pincode,
            state,
            status: 1, // default active
        });

        return res.status(201).json({
            success: true,
            message: "School created successfully",
            school
        });

    } catch (error) {
        console.error("Error creating school:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

controller.getSchoolById = async (req, res) => {
    try {
        const school = await School.findByPk(req.params.id);
        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }
        res.json(school);
    } catch (error) {
        console.error("Error fetching school:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;

        const school = await School.findByPk(id);
        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }

        await school.update({ status: 0 }); // Soft delete

        return res.status(200).json({ success: true, message: "School deleted successfully" });
    } catch (error) {
        console.error("Error deleting school:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, shortcode, phoneNumber, address, city, state, pincode } = req.body;

        const school = await School.findOne({
            where: { id, status: 1 }
        });

        if (!school) {
            return res.status(404).json({ error: "School not found" });
        }

        await school.update({
            name,
            shortcode,
            phoneNumber,
            address,
            city,
            state,
            pincode
        });

        return res.status(200).json({
            success: true,
            message: "School updated successfully",
            school
        });

    } catch (error) {
        console.error("Error updating school:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


module.exports = controller;