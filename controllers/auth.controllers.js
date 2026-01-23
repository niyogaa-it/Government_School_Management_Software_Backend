const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/index");

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await Admin.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // ✅ Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Generate JWT token
        const token = jwt.sign({ id: user.id, role: user.roleId }, "your_secret_key", { expiresIn: "1h" });

        return res.json({ token, user });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = { loginUser };
