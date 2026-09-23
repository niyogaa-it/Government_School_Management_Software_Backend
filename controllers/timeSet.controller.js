const sequelize = require("../config/database");
const { TimeSet, TimeSlot, TimeSetSection, Section, Grade, School } = require("../models");
const { Op, fn, col, where: sqlWhere } = require("sequelize");

const controller = {};

// ─────────────────────────────────────────────────────────────────────────────
// TIME SET (header: name + school + academic year)
// ─────────────────────────────────────────────────────────────────────────────

controller.createTimeSet = async (req, res) => {
    try {
        const { name, school_id, academic_year } = req.body;

        if (!name || !school_id || !academic_year) {
            return res.status(400).json({ error: "Name, School and Academic Year are required" });
        }

        const existing = await TimeSet.findOne({
            where: { name, school_id, academic_year, status: 1 },
        });
        if (existing) {
            return res.status(400).json({ error: "A Time Set with this name already exists for this school and year" });
        }

        const timeSet = await TimeSet.create({ name, school_id, academic_year, status: 1 });
        return res.status(201).json({ message: "Time Set created successfully", timeSet });
    } catch (error) {
        console.error("Error creating time set:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllTimeSets = async (req, res) => {
    try {
        const timeSets = await TimeSet.findAll({
            where: { status: 1 },
            include: { model: School, attributes: ["id", "name"] },
        });
        res.status(200).json({ timeSets });
    } catch (error) {
        console.error("Error fetching time sets:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getTimeSetsBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        const timeSets = await TimeSet.findAll({
            where: { school_id, status: 1 },
            include: { model: School, attributes: ["id", "name"] },
        });
        res.status(200).json({ timeSets });
    } catch (error) {
        console.error("Error fetching time sets:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getTimeSetsBySchoolAndYear = async (req, res) => {
    try {
        const { school_id, academic_year } = req.params;
        const { Op, fn, replace, col } = require("sequelize"); // or destructure Sequelize at top

        const timeSets = await TimeSet.findAll({
            where: {
                school_id,
                status: 1,
                [Op.and]: sequelize.where(
                    sequelize.fn("REPLACE", sequelize.col("academic_year"), " ", ""),
                    academic_year.replace(/\s+/g, "")
                ),
            },
            attributes: ["id", "name", "academic_year", "school_id"],
            include: { model: School, attributes: ["id", "name"] },
        });
        res.status(200).json({ timeSets });
    } catch (error) {
        console.error("Error fetching time sets:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getTimeSetById = async (req, res) => {
    try {
        const { id } = req.params;

        // NOTE: `separate: true` is only reliable with Sequelize's `findAll`
        // eager-loading — when combined with `findOne`/`findByPk` (as it was
        // here) the TimeSlot association silently comes back empty, which is
        // why stored slots weren't showing up on the "View" screen. Fetching
        // the slots as their own query sidesteps that limitation entirely.
        const timeSet = await TimeSet.findOne({
            where: { id, status: 1 },
            include: [{ model: School, attributes: ["id", "name"] }],
        });

        if (!timeSet) return res.status(404).json({ error: "Time Set not found" });

        const slots = await TimeSlot.findAll({
            where: { time_set_id: id, status: 1 },
            order: [["serial_no", "ASC"]],
        });

        const result = timeSet.toJSON();
        result.TimeSlots = slots;

        res.status(200).json({ timeSet: result });
    } catch (error) {
        console.error("Error fetching time set:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateTimeSet = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        const timeSet = await TimeSet.findOne({ where: { id, status: 1 } });
        if (!timeSet) return res.status(404).json({ error: "Time Set not found" });

        const duplicate = await TimeSet.findOne({
            where: {
                name: name.trim(),
                school_id: timeSet.school_id,
                academic_year: timeSet.academic_year,
                status: 1,
                id: { [Op.ne]: id },
            },
        });
        if (duplicate) {
            return res.status(400).json({ error: "A Time Set with this name already exists for this school and year" });
        }

        await timeSet.update({ name: name.trim() });
        res.status(200).json({ message: "Time Set updated successfully", timeSet });
    } catch (error) {
        console.error("Error updating time set:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteTimeSet = async (req, res) => {
    try {
        const { id } = req.params;
        const timeSet = await TimeSet.findByPk(id);
        if (!timeSet) return res.status(404).json({ error: "Time Set not found" });

        await timeSet.update({ status: 0 });
        // Also release any sections locked to this time set
        await TimeSetSection.update({ status: 0 }, { where: { time_set_id: id, status: 1 } });

        res.status(200).json({ message: "Time Set deleted successfully" });
    } catch (error) {
        console.error("Error deleting time set:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// TIME SLOTS (periods / breaks inside a Time Set)
// ─────────────────────────────────────────────────────────────────────────────

const timesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

controller.addTimeSlot = async (req, res) => {
    try {
        const { time_set_id, name, start_time, end_time, is_break } = req.body;

        if (!time_set_id || !name || !start_time || !end_time) {
            return res.status(400).json({ error: "Name, Start Time and End Time are required" });
        }
        if (start_time >= end_time) {
            return res.status(400).json({ error: "End Time must be after Start Time" });
        }

        const timeSet = await TimeSet.findByPk(time_set_id);
        if (!timeSet) return res.status(404).json({ error: "Time Set not found" });

        // Prevent overlapping periods within the same time set
        const siblings = await TimeSlot.findAll({ where: { time_set_id, status: 1 } });
        const clash = siblings.some(s => timesOverlap(start_time, end_time, s.start_time, s.end_time));
        if (clash) {
            return res.status(400).json({ error: "This time overlaps with an existing slot" });
        }

        const count = await TimeSlot.count({ where: { time_set_id, status: 1 } });

        const slot = await TimeSlot.create({
            time_set_id,
            serial_no: count + 1,
            name,
            start_time,
            end_time,
            is_break: !!is_break,
            status: 1,
        });

        res.status(201).json({ message: "Time Slot added successfully", slot });
    } catch (error) {
        console.error("Error adding time slot:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateTimeSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_time, end_time, is_break } = req.body;

        const slot = await TimeSlot.findByPk(id);
        if (!slot) return res.status(404).json({ error: "Time Slot not found" });

        if (start_time && end_time && start_time >= end_time) {
            return res.status(400).json({ error: "End Time must be after Start Time" });
        }

        if (start_time && end_time) {
            const siblings = await TimeSlot.findAll({
                where: { time_set_id: slot.time_set_id, status: 1, id: { [require("sequelize").Op.ne]: id } },
            });
            const clash = siblings.some(s => timesOverlap(start_time, end_time, s.start_time, s.end_time));
            if (clash) return res.status(400).json({ error: "This time overlaps with an existing slot" });
        }

        await slot.update({ name, start_time, end_time, is_break: !!is_break });
        res.status(200).json({ message: "Time Slot updated successfully", slot });
    } catch (error) {
        console.error("Error updating time slot:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteTimeSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const slot = await TimeSlot.findByPk(id);
        if (!slot) return res.status(404).json({ error: "Time Slot not found" });

        await slot.update({ status: 0 });
        res.status(200).json({ message: "Time Slot deleted successfully" });
    } catch (error) {
        console.error("Error deleting time slot:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION ASSIGNMENT ("Manage Time Set" — un-assigned / assigned lists)
//
// A section can now be linked to MULTIPLE Time Sets at the same time (e.g. a
// regular-day Time Set and a separate exam/half-day Time Set). This is what
// lets "New Week Days" offer more than one Time Set per day for the same
// section. The old code force-released a section from every other Time Set
// whenever it was (re)assigned, which capped a section at exactly one active
// link and is why the Week Days dropdown could only ever show the most
// recent Time Set.
// ─────────────────────────────────────────────────────────────────────────────

controller.getSectionsForTimeSet = async (req, res) => {
    try {
        const { time_set_id, school_id, academic_year } = req.params;

        const normalizedYear = academic_year.replace(/\s+/g, "");

        // NOTE: previously this filtered academic_year in raw SQL via
        // col("section.academic_year") / col("Section.academic_year") — two
        // DIFFERENT casings referring to what's meant to be the same table.
        // The association TimeSetSection.belongsTo(Section, ...) has no
        // explicit `as`, so its real join alias is the lowercase "section"
        // (matching sequelize.define("section", ...)) — "Section" doesn't
        // match it. That mismatch is fragile across DB engines/collations.
        // Filtering in JS instead sidesteps it entirely — same pattern
        // already used above in getTimeSetById for the TimeSlot association.
        const allSectionsRaw = await Section.findAll({
            where: { school_id, status: 1 },
            include: [{ model: Grade, attributes: ["id", "grade"] }],
        });
        const allSections = allSectionsRaw.filter(
            s => (s.academic_year || "").replace(/\s+/g, "") === normalizedYear
        );

        // Every active section->time-set link, regardless of school/year —
        // a section can now have more than one, so collect all of them
        // instead of keeping just the latest.
        const allLinks = await TimeSetSection.findAll({ where: { status: 1 } });
        const linkedTimeSetIdsBySection = new Map();
        allLinks.forEach(l => {
            const list = linkedTimeSetIdsBySection.get(l.section_id) || [];
            list.push(String(l.time_set_id));
            linkedTimeSetIdsBySection.set(l.section_id, list);
        });

        const label = (s) => `${s.Grade?.grade || ""}_${s.sectionName}`.replace(/^_/, "");

        // A section is "assigned" here if it's linked to THIS time set —
        // it may also be linked to others, and that's fine now, so there's
        // no more "locked elsewhere" state to special-case.
        const assigned = [];
        const unassigned = [];
        allSections.forEach(s => {
            const item = { id: s.id, label: label(s), grade_id: s.grade_id };
            const links = linkedTimeSetIdsBySection.get(s.id) || [];
            if (links.includes(String(time_set_id))) {
                assigned.push(item);
            } else {
                unassigned.push(item);
            }
        });

        res.status(200).json({ assigned, unassigned });
    } catch (error) {
        console.error("Error fetching sections for time set:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.saveSectionAssignments = async (req, res) => {
    try {
        const { time_set_id } = req.params;
        const { section_ids } = req.body;

        const timeSet = await TimeSet.findByPk(time_set_id);
        if (!timeSet) return res.status(404).json({ error: "Time Set not found" });

        // Only touch links that involve THIS time set. We deliberately do
        // NOT release a section from any other time set it's linked to
        // anymore — a section is allowed to belong to more than one Time
        // Set at once (see comment above).
        await TimeSetSection.update({ status: 0 }, { where: { time_set_id, status: 1 } });

        for (const section_id of section_ids || []) {
            const existing = await TimeSetSection.findOne({ where: { time_set_id, section_id } });
            if (existing) {
                await existing.update({ status: 1 });
            } else {
                await TimeSetSection.create({ time_set_id, section_id, status: 1 });
            }
        }

        res.status(200).json({ message: "Section assignments saved successfully" });
    } catch (error) {
        console.error("Error saving section assignments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Given a section, return the time slots (periods/breaks) it follows —
// this is what a timetable-builder screen would call.
//
// NOTE: a section can now have more than one active Time Set. This endpoint
// is used where a single "the" time set for a section is expected (e.g. a
// generic timetable builder), so it keeps returning just one — picking the
// most recently linked one. If you need every Time Set a section follows,
// use /weekday/getTimeSetsForSection instead (that one already returns all
// of them, which is what powers the New/Edit Week Days dropdown).
controller.getTimeSlotsForSection = async (req, res) => {
    try {
        const { section_id } = req.params;

        const link = await TimeSetSection.findOne({
            where: { section_id, status: 1 },
            order: [["updatedAt", "DESC"]],
        });
        if (!link) return res.status(404).json({ message: "This section has no time set assigned." });

        const slots = await TimeSlot.findAll({
            where: { time_set_id: link.time_set_id, status: 1 },
            order: [["serial_no", "ASC"]],
        });

        res.status(200).json({ time_set_id: link.time_set_id, slots });
    } catch (error) {
        console.error("Error fetching time slots for section:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;