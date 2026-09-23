// routes/eventRoutes.js
const express = require("express");
const multer  = require("multer");
const path    = require("path");
const router  = express.Router();
const {
  getEvents, createEvent, updateEvent, deleteEvent, getAttachment,
  getHolidayDates,
} = require("../controllers/event.controller");

// ── Multer config — store in MEMORY (buffer), controller writes to DB ─────────
const upload = multer({
  storage: multer.memoryStorage(),          // ✅ keep file in RAM as buffer
  limits: { fileSize: 1.5 * 1024 * 1024 }, // ✅ 1.5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|doc|docx|jpg|jpeg|png/i;
    const ext     = path.extname(file.originalname).replace(".", "");
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error("Only PDF, DOC, DOCX, JPG, PNG files are allowed"));
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.get   ("/getEvents",           getEvents);
router.get   ("/getAttachment/:id",   getAttachment);
router.get   ("/getHolidayDates",     getHolidayDates);           // holiday auto-detection
router.post  ("/createEvent",         upload.single("attachment"), createEvent);
router.put   ("/updateEvent/:id",     upload.single("attachment"), updateEvent);
router.delete("/deleteEvent/:id",     deleteEvent);

module.exports = router;