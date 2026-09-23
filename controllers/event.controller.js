const { Op } = require("sequelize");
const Event = require("../models/Event");
const Grade = require("../models/grade");

const controller = {};

const MAX_FILE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY KEYWORDS — a date's event title matching any of these triggers
// an auto-holiday in attendance (case-insensitive, partial match)
// ─────────────────────────────────────────────────────────────────────────────
const HOLIDAY_KEYWORDS = [
  "holiday",
  "school holiday",
  "school holidays",
  "school closed",
  "closed",
  "leave",
  "school leave",
 "holidays",
  "leaves",
  "Government Leave"
];

/**
 * Returns true if the given event title contains at least one holiday keyword.
 * @param {string} title
 */
const isHolidayTitle = (title = "") => {
  const lower = title.toLowerCase().trim();
  return HOLIDAY_KEYWORDS.some((kw) => lower.includes(kw));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET HOLIDAY DATES
// Returns a Set (as array) of "YYYY-MM-DD" strings that should be treated as
// holidays in attendance, based on:
//   • Every Sunday (handled client-side — not here)
//   • Any Saturday whose event title contains a holiday keyword
//   • Any weekday whose event title contains a holiday keyword,
//     AND the event applies to the requested grade (grade_ids empty = all grades)
//
// Route: GET /event/getHolidayDates
// Query: school_id, academicYear, grade_id, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────
controller.getHolidayDates = async (req, res) => {
  try {
    const { school_id, academicYear, grade_id, startDate, endDate } = req.query;

    if (!school_id || !startDate || !endDate) {
      return res.status(400).json({
        error: "school_id, startDate and endDate are required",
      });
    }

    // Fetch all events in the date range for this school (exclude heavy attachment)
    const events = await Event.findAll({
      where: {
        school_id,
        ...(academicYear ? { academicYear } : {}),
        eventDate: { [Op.between]: [startDate, endDate] },
      },
      attributes: ["id", "title", "eventDate", "grade_ids"],
    });

    const holidayDates = [];

    for (const ev of events) {
      if (!isHolidayTitle(ev.title)) continue;

      // Parse grade_ids (stored as JSON array or stringified JSON)
      let ids = ev.grade_ids;
      if (typeof ids === "string") {
        try { ids = JSON.parse(ids); } catch { ids = []; }
      }
      if (!Array.isArray(ids)) ids = [];

      const dateStr = ev.eventDate; // "YYYY-MM-DD"
      const dow = new Date(dateStr).getDay(); // 0=Sun,6=Sat

      if (dow === 0) {
        // Sunday — always holiday regardless; client already handles this,
        // but include it anyway for completeness.
        holidayDates.push(dateStr);
        continue;
      }

      if (dow === 6) {
        // Saturday — mark holiday if the event is for this grade or all grades
        const appliesToGrade =
          ids.length === 0 ||
          (grade_id && ids.map(String).includes(String(grade_id)));
        if (appliesToGrade) holidayDates.push(dateStr);
        continue;
      }

      // Weekday — mark holiday if the event applies to this grade or all grades
      const appliesToGrade =
        ids.length === 0 ||
        (grade_id && ids.map(String).includes(String(grade_id)));
      if (appliesToGrade) holidayDates.push(dateStr);
    }

    // Deduplicate
    const unique = [...new Set(holidayDates)];

    return res.status(200).json({ holidayDates: unique });
  } catch (error) {
    console.error("Error fetching holiday dates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE EVENT
// ─────────────────────────────────────────────────────────────────────────────
controller.createEvent = async (req, res) => {
  try {
    const { title, description, eventDate, academicYear, school_id } = req.body;

    if (!title || !eventDate || !school_id || !academicYear) {
      return res.status(400).json({
        error: "title, eventDate, school_id and academicYear are required",
      });
    }

    // Parse grade_ids
    let grade_ids = [];
    try {
      grade_ids = JSON.parse(req.body.grade_ids || "[]");
    } catch {
      grade_ids = [];
    }

    // ✅ Store file as base64 in DB
    let attachmentName = null;
    let attachmentType = null;
    let attachmentData = null;

    if (req.file) {
      if (req.file.size > MAX_FILE_BYTES) {
        return res.status(400).json({ error: "File size must be 1.5 MB or less." });
      }
      attachmentName = req.file.originalname;
      attachmentType = req.file.mimetype;
      attachmentData = req.file.buffer.toString("base64");
    }

    const newEvent = await Event.create({
      school_id,
      academicYear,
      title: title.trim(),
      description: description?.trim() || null,
      eventDate,
      grade_ids,
      attachmentName,
      attachmentType,
      attachmentData,
    });

    // Don't send attachmentData back in create response (it's large)
    const { attachmentData: _skip, ...eventOut } = newEvent.toJSON();

    res.status(201).json({
      message: "Event created successfully",
      event: {
        ...eventOut,
        hasAttachment: !!attachmentData,
      },
    });

  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET EVENTS  (attachment data NOT returned — use /getAttachment/:id)
// ─────────────────────────────────────────────────────────────────────────────
controller.getEvents = async (req, res) => {
  try {
    const { school_id, academicYear } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: "school_id is required" });
    }

    const where = { school_id };
    if (academicYear) where.academicYear = academicYear;

    // ✅ Filter by month+year if provided (for calendar view accuracy)
    const { month, year } = req.query;
    if (month && year) {
      const mm = String(month).padStart(2, "0");
      const yy = String(year);
      const lastDay = new Date(Number(yy), Number(mm), 0).getDate(); 
      where.eventDate = {
        [Op.between]: [`${yy}-${mm}-01`, `${yy}-${mm}-${String(lastDay).padStart(2, "0")}`],
      };
    }

    // Exclude heavy attachmentData from list query
    const events = await Event.findAll({
      where,
      attributes: { exclude: ["attachmentData"] },
      order: [["eventDate", "ASC"]],
    });

    const { grade_ids: filterGradeIds } = req.query;
let filteredEvents = events;
if (filterGradeIds) {
  const requested = filterGradeIds.split(",").map(String);
  filteredEvents = events.filter(ev => {
    let ids = ev.grade_ids;
    if (typeof ids === "string") { try { ids = JSON.parse(ids); } catch { ids = []; } }
    if (!Array.isArray(ids) || ids.length === 0) return true; // "all classes" always shows
    return ids.map(String).some(id => requested.includes(id));
  });
}

    // Collect all grade_ids
    let allGradeIds = [];
    events.forEach(ev => {
      let ids = ev.grade_ids;
      if (typeof ids === "string") {
        try { ids = JSON.parse(ids); } catch { ids = []; }
      }
      if (Array.isArray(ids)) allGradeIds.push(...ids);
    });

    allGradeIds = [...new Set(allGradeIds)];

    // Fetch grade names
    let gradeMap = {};
    if (allGradeIds.length > 0) {
      const grades = await Grade.findAll({
        where: { id: allGradeIds },
        attributes: ["id", "grade"],
      });
      grades.forEach(g => { gradeMap[String(g.id)] = g.grade; }); // ✅ string keys
    }

    const result = await Promise.all(events.map(async (ev) => {
      let ids = ev.grade_ids;
      if (typeof ids === "string") {
        try { ids = JSON.parse(ids); } catch { ids = []; }
      }

      let grade_names = [];
      if (ids.length === 0) {
        const allGrades = await Grade.findAll({
          where: { school_id: ev.school_id, academic_year: ev.academicYear },
          attributes: ["grade"],
        });
        grade_names = allGrades.length > 0
          ? allGrades.map(g => g.grade)
          : ["All Classes"];
      } else {
        grade_names = ids.map(id => gradeMap[String(id)] || `Grade ${id}`); // ✅ string lookup
      }

      return {
        ...ev.toJSON(),
        grade_ids: ids,
        grade_names,
        // ✅ Tell the frontend whether there is an attachment (no binary blob)
        hasAttachment: !!ev.attachmentName,
      };
    }));

    res.status(200).json({ events: result });

  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ATTACHMENT  — streams the stored base64 file back as the original MIME type
// GET /event/getAttachment/:id
// ─────────────────────────────────────────────────────────────────────────────
controller.getAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      attributes: ["id", "attachmentName", "attachmentType", "attachmentData"],
    });

    if (!event || !event.attachmentData) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const buffer = Buffer.from(event.attachmentData, "base64");

    res.set({
      "Content-Type": event.attachmentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${event.attachmentName}"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);

  } catch (error) {
    console.error("Error fetching attachment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE EVENT
// ─────────────────────────────────────────────────────────────────────────────
controller.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const { title, description, eventDate, academicYear, school_id } = req.body;

    let grade_ids = event.grade_ids;
    if (req.body.grade_ids) {
      try { grade_ids = JSON.parse(req.body.grade_ids); } catch { grade_ids = []; }
    }

    let attachmentName = event.attachmentName;
    let attachmentType = event.attachmentType;
    let attachmentData = event.attachmentData;

    if (req.file) {
      if (req.file.size > MAX_FILE_BYTES) {
        return res.status(400).json({ error: "File size must be 1.5 MB or less." });
      }
      attachmentName = req.file.originalname;
      attachmentType = req.file.mimetype;
      attachmentData = req.file.buffer.toString("base64");
    }

    // If frontend explicitly cleared the attachment
    if (req.body.clearAttachment === "true") {
      attachmentName = null;
      attachmentType = null;
      attachmentData = null;
    }

    await event.update({
      title: title || event.title,
      description: description ?? event.description,
      eventDate: eventDate || event.eventDate,
      academicYear: academicYear || event.academicYear,
      school_id: school_id || event.school_id,
      grade_ids,
      attachmentName,
      attachmentType,
      attachmentData,
    });

    res.status(200).json({ message: "Event updated successfully" });

  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE EVENT
// ─────────────────────────────────────────────────────────────────────────────
controller.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // No disk file to delete — just destroy the DB row
    await event.destroy();

    res.status(200).json({ message: "Event deleted successfully" });

  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = controller;