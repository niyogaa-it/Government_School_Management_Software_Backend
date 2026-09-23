// routes/bulkupload.router.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/bulkupload.controller");

// Store file in memory buffer (no disk writes needed)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        const allowed = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only .xlsx and .xls files are allowed"));
        }
    },
});

// ── Template downloads ─────────────────────────────────────────────────────────
// GET /bulkupload/template/hsc   → download HSC_BulkUpload_Template.xlsx
// GET /bulkupload/template/sslc  → download SSLC_BulkUpload_Template.xlsx
router.get("/template/:type", (req, res) => {
    const { type } = req.params;
    const allowed = { hsc: "HSC_BulkUpload_Template.xlsx", sslc: "SSLC_BulkUpload_Template.xlsx" };
    const fileName = allowed[type?.toLowerCase()];

    if (!fileName) {
        return res.status(400).json({ error: "Invalid template type. Use 'hsc' or 'sslc'." });
    }

    // Templates live in:  <project_root>/public/templates/<fileName>
    const filePath = path.join(__dirname, "../public/templates", fileName);

    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error("Template download error:", err);
            // Only send error if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(404).json({ error: "Template file not found on server." });
            }
        }
    });
});

// ── Bulk upload ────────────────────────────────────────────────────────────────
// POST /bulkupload/hsc   → upload Excel → insert into Studenthsc table
router.post("/hsc", upload.single("file"), controller.bulkUploadHSC);

// POST /bulkupload/sslc  → upload Excel → insert into Studentsslc table
router.post("/sslc", upload.single("file"), controller.bulkUploadSSLC);

module.exports = router;