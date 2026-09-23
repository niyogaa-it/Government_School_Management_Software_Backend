const sequelize = require("../config/database");
const { WeekDaySchedule, WeekDaySlot, TimeSetSection, TimeSet, TimeSlot, School, Grade, Section } = require("../models");
const { Op, fn, col, where: sqlWhere } = require("sequelize");

const controller = {};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Time sets already assigned to this section (via TimeSetSection) —
// this is what populates each day's dropdown.
controller.getTimeSetsForSection = async (req, res) => {
    try {
        const { section_id } = req.params;

        const links = await TimeSetSection.findAll({
            where: { section_id, status: 1 },
            include: [{ model: TimeSet, attributes: ["id", "name"], where: { status: 1 } }],
        });

        const timeSets = links.map(l => ({ id: l.TimeSet.id, name: l.TimeSet.name }));
        res.status(200).json({ timeSets });
    } catch (error) {
        console.error("Error fetching time sets for section:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-day periods for a section — this is what the Timetable builder should
// use instead of timeSet.controller.getTimeSlotsForSection. That endpoint
// picks a single "most recently linked" Time Set and applies it to every
// day, which is wrong once Week Days has different Time Sets on different
// days (e.g. a shorter Saturday Time Set). This endpoint instead walks the
// actual Week Days -> day_of_week -> Time Set -> Time Slots chain, so each
// day comes back with its own real period list (start_time/end_time/name),
// exactly as configured on the Week Days screen.
//
// GET /weekday/getPeriodsForSection/:section_id
// Response: {
//   week_day_schedule_id, applicable_date,
//   periodsByDay: {
//     Monday: { time_set_id, time_set_name, periods: [{ id, name, start_time, end_time, is_break }] },
//     ...
//   }
// }
controller.getPeriodsForSection = async (req, res) => {
    try {
        const { section_id } = req.params;

        // Most recently defined Week Days header for this section. Same
        // "pick the latest" convention timeSet.controller.getTimeSlotsForSection
        // already uses for its single-Time-Set shortcut — if a section has
        // several Week Days schedules over time (different applicable_date),
        // the newest one is the one currently in force.
        const header = await WeekDaySchedule.findOne({
            where: { section_id, status: 1 },
            order: [["applicable_date", "DESC"]],
        });
        if (!header) {
            return res.status(404).json({
                error: "No Week Days schedule found for this section. Set one up on the Week Days screen first.",
            });
        }

        const daySlots = await WeekDaySlot.findAll({
            where: { week_day_schedule_id: header.id, status: 1 },
        });
        if (daySlots.length === 0) {
            return res.status(404).json({ error: "This section's Week Days schedule has no days configured." });
        }

        const timeSetIds = [...new Set(daySlots.map(d => d.time_set_id))];

        const [allPeriods, timeSets] = await Promise.all([
            TimeSlot.findAll({ where: { time_set_id: timeSetIds, status: 1 }, order: [["serial_no", "ASC"]] }),
            TimeSet.findAll({ where: { id: timeSetIds }, attributes: ["id", "name"] }),
        ]);

        const periodsByTimeSet = new Map();
        for (const p of allPeriods) {
            if (!periodsByTimeSet.has(p.time_set_id)) periodsByTimeSet.set(p.time_set_id, []);
            periodsByTimeSet.get(p.time_set_id).push({
                id: p.id, name: p.name, start_time: p.start_time, end_time: p.end_time, is_break: !!p.is_break,
            });
        }
        const timeSetById = new Map(timeSets.map(t => [t.id, t]));

        const periodsByDay = {};
        for (const d of daySlots) {
            periodsByDay[d.day_of_week] = {
                time_set_id: d.time_set_id,
                time_set_name: timeSetById.get(d.time_set_id)?.name || "",
                periods: periodsByTimeSet.get(d.time_set_id) || [],
            };
        }

        res.status(200).json({
            week_day_schedule_id: header.id,
            applicable_date: header.applicable_date,
            periodsByDay,
        });
    } catch (error) {
        console.error("Error fetching periods for section:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Create the header + one detail row per checked day
controller.createWeekDaySchedule = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { school_id, academic_year, grade_id, section_id, applicable_date, days } = req.body;
        // days = [{ day_of_week: "Monday", time_set_id: 3 }, ...]  — only checked days included

        if (!school_id || !academic_year || !grade_id || !section_id || !applicable_date) {
            await t.rollback();
            return res.status(400).json({ error: "School, Academic Year, Class, Section and Applicable Date are required" });
        }
        if (!Array.isArray(days) || days.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: "Select at least one day and its Time Set" });
        }
        const missingTimeSet = days.find(d => !d.time_set_id);
        if (missingTimeSet) {
            await t.rollback();
            return res.status(400).json({ error: `Time Set is required for ${missingTimeSet.day_of_week}` });
        }

        const header = await WeekDaySchedule.create(
            { school_id, academic_year, grade_id, section_id, applicable_date, status: 1 },
            { transaction: t }
        );

        for (const d of days) {
            await WeekDaySlot.create(
                { week_day_schedule_id: header.id, day_of_week: d.day_of_week, time_set_id: d.time_set_id, status: 1 },
                { transaction: t }
            );
        }

        await t.commit();
        res.status(201).json({ message: "Week Days schedule saved successfully", id: header.id });
    } catch (error) {
        await t.rollback();
        console.error("Error creating week day schedule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// List — School, Academic Year, Grade, Section, Applicable Date per row
controller.getAllWeekDaySchedules = async (req, res) => {
    try {
        const schedules = await WeekDaySchedule.findAll({
            where: { status: 1 },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] },
            ],
            order: [["applicable_date", "DESC"]],
        });

        // NOTE: Eager-loading `Section` directly here (`{ model: Section }`)
        // was silently coming back null on every row, even though section_id
        // is correctly stored on WeekDaySchedule — this is the same class of
        // association issue documented in timeSet.controller.js's
        // getTimeSetById (see the note there re: TimeSlot). Rather than rely
        // on that association, we look sections up as their own query and
        // merge them in by id, which is what was causing "Section" to show
        // as N/A on the list screen.
        const sectionIds = [...new Set(schedules.map(s => s.section_id).filter(Boolean))];
        const sections = sectionIds.length
            ? await Section.findAll({ where: { id: sectionIds }, attributes: ["id", "sectionName"] })
            : [];
        const sectionById = new Map(sections.map(s => [s.id, s]));

        const result = schedules.map(s => {
            const plain = s.toJSON();
            plain.Section = sectionById.get(s.section_id) || null;
            return plain;
        });

        res.status(200).json({ schedules: result });
    } catch (error) {
        console.error("Error fetching week day schedules:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getWeekDayScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await WeekDaySchedule.findOne({
            where: { id, status: 1 },
            include: [
                { model: School, attributes: ["id", "name"] },
                { model: Grade, attributes: ["id", "grade"] },
            ],
        });
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });

        const slots = await WeekDaySlot.findAll({
            where: { week_day_schedule_id: id, status: 1 },
            include: [{ model: TimeSet, attributes: ["id", "name"] }],
        });

        // Same fix as getAllWeekDaySchedules — fetch the Section directly by
        // section_id instead of relying on the eager-load include.
        const section = schedule.section_id
            ? await Section.findOne({ where: { id: schedule.section_id }, attributes: ["id", "sectionName"] })
            : null;

        const result = schedule.toJSON();
        result.Section = section;
        result.days = slots;
        res.status(200).json({ schedule: result });
    } catch (error) {
        console.error("Error fetching week day schedule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Update the header + replace all detail rows with the new set of days.
// Same shape of input as create: { school_id, academic_year, grade_id,
// section_id, applicable_date, days: [{ day_of_week, time_set_id }, ...] }
controller.updateWeekDaySchedule = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { school_id, academic_year, grade_id, section_id, applicable_date, days } = req.body;

        const header = await WeekDaySchedule.findOne({ where: { id, status: 1 }, transaction: t });
        if (!header) {
            await t.rollback();
            return res.status(404).json({ error: "Schedule not found" });
        }

        if (!school_id || !academic_year || !grade_id || !section_id || !applicable_date) {
            await t.rollback();
            return res.status(400).json({ error: "School, Academic Year, Class, Section and Applicable Date are required" });
        }
        if (!Array.isArray(days) || days.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: "Select at least one day and its Time Set" });
        }
        const missingTimeSet = days.find(d => !d.time_set_id);
        if (missingTimeSet) {
            await t.rollback();
            return res.status(400).json({ error: `Time Set is required for ${missingTimeSet.day_of_week}` });
        }

        await header.update(
            { school_id, academic_year, grade_id, section_id, applicable_date },
            { transaction: t }
        );

        // Replace the day rows wholesale — soft-delete the old ones, insert the new set.
        await WeekDaySlot.update(
            { status: 0 },
            { where: { week_day_schedule_id: id, status: 1 }, transaction: t }
        );
        for (const d of days) {
            await WeekDaySlot.create(
                { week_day_schedule_id: id, day_of_week: d.day_of_week, time_set_id: d.time_set_id, status: 1 },
                { transaction: t }
            );
        }

        await t.commit();
        res.status(200).json({ message: "Week Days schedule updated successfully" });
    } catch (error) {
        await t.rollback();
        console.error("Error updating week day schedule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteWeekDaySchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await WeekDaySchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ error: "Schedule not found" });

        await schedule.update({ status: 0 });
        await WeekDaySlot.update({ status: 0 }, { where: { week_day_schedule_id: id, status: 1 } });

        res.status(200).json({ message: "Schedule deleted successfully" });
    } catch (error) {
        console.error("Error deleting week day schedule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;