// const jwt = require("jsonwebtoken");
// require("dotenv").config();

// const authenticate = (allowedRoles) => (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Access denied. No token provided." });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!allowedRoles.includes(decoded.role)) {
//       return res.status(403).json({ message: "Access denied. Insufficient permissions." });
//     }

//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(400).json({ message: "Invalid token." });
//   }
// };

// module.exports = authenticate;
