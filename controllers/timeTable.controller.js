const sequelize = require("../config/database");
const crypto = require("crypto");
const { TimeTable, TimeTableEntry, Section, Subject, Instructor, TimeSlot, School } = require("../models");
const { Op } = require("sequelize");

const controller = {};

const MAX_ENTRIES_PER_CELL = 16;

controller.createTimeTable = async (req, res) => {
    try {
        const { school_id, academic_year, start_date, end_date } = req.body;
        if (!school_id || !academic_year || !start_date || !end_date) {
            return res.status(400).json({ error: "School, Academic Year, Start Date and End Date are required" });
        }
        if (new Date(start_date) >= new Date(end_date)) {
            return res.status(400).json({ error: "End Date must be after Start Date" });
        }

        const timeTable = await TimeTable.create({ school_id, academic_year, start_date, end_date, status: 1 });
        res.status(201).json({ message: "Timetable created successfully", timeTable });
    } catch (error) {
        console.error("Error creating timetable:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getTimeTablesForSchool = async (req, res) => {
    try {
        const { school_id, academic_year } = req.params;
        const timeTables = await TimeTable.findAll({
            where: { school_id, academic_year, status: 1 },
            order: [["start_date", "ASC"]],
        });
        res.status(200).json({ timeTables });
    } catch (error) {
        console.error("Error fetching timetables:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getAllTimeTables = async (req, res) => {
    try {
        const timeTables = await TimeTable.findAll({
            where: { status: 1 },
            include: [{ model: School, attributes: ["id", "name"] }],
            order: [["start_date", "DESC"]],
        });
        res.status(200).json({ timeTables });
    } catch (error) {
        console.error("Error fetching timetables:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getTimeTablesBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        const timeTables = await TimeTable.findAll({
            where: { school_id, status: 1 },
            include: [{ model: School, attributes: ["id", "name"] }],
            order: [["start_date", "DESC"]],
        });
        res.status(200).json({ timeTables });
    } catch (error) {
        console.error("Error fetching timetables by school:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getTimeTableById = async (req, res) => {
    try {
        const { id } = req.params;
        const timeTable = await TimeTable.findOne({
            where: { id, status: 1 },
            include: [{ model: School, attributes: ["id", "name"] }],
        });
        if (!timeTable) return res.status(404).json({ error: "Timetable not found" });
        res.status(200).json({ timeTable });
    } catch (error) {
        console.error("Error fetching timetable:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.updateTimeTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.body;

        const timeTable = await TimeTable.findOne({ where: { id, status: 1 } });
        if (!timeTable) return res.status(404).json({ error: "Timetable not found" });

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "Start Date and End Date are required" });
        }
        if (new Date(start_date) >= new Date(end_date)) {
            return res.status(400).json({ error: "End Date must be after Start Date" });
        }

        await timeTable.update({ start_date, end_date });
        res.status(200).json({ message: "Timetable updated successfully", timeTable });
    } catch (error) {
        console.error("Error updating timetable:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.deleteTimeTable = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const timeTable = await TimeTable.findOne({ where: { id, status: 1 }, transaction: t });
        if (!timeTable) {
            await t.rollback();
            return res.status(404).json({ error: "Timetable not found" });
        }

        await TimeTableEntry.update({ status: 0 }, { where: { time_table_id: id }, transaction: t });
        await timeTable.update({ status: 0 }, { transaction: t });

        await t.commit();
        res.status(200).json({ message: "Timetable deleted successfully" });
    } catch (error) {
        await t.rollback();
        console.error("Error deleting timetable:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// One period (day + time_slot + section) can hold multiple entries.
// Also handles "combined classes": if the same instructor is already
// teaching the SAME subject in this exact day/period for a different
// section, this returns a 409 with conflict info instead of failing
// outright — the frontend can then offer to combine the two sections
// into one shared class. Pass `combine: true` (+ the conflict info) to
// actually create the combined entry.
controller.addTimeTableEntry = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            time_table_id, section_id, day_of_week, time_slot_id, subject_id, instructor_id,
            combine, combine_with_group_id, combine_with_entry_id,
        } = req.body;

        if (!time_table_id || !section_id || !day_of_week || !time_slot_id || !subject_id || !instructor_id) {
            await t.rollback();
            return res.status(400).json({ error: "All fields are required" });
        }

        const timeTable = await TimeTable.findOne({ where: { id: time_table_id, status: 1 }, transaction: t });
        if (!timeTable) {
            await t.rollback();
            return res.status(404).json({ error: "Timetable not found" });
        }

        const existing = await TimeTableEntry.findAll({
            where: { time_table_id, section_id, day_of_week, time_slot_id, status: 1 },
            transaction: t,
        });
        if (existing.length >= MAX_ENTRIES_PER_CELL) {
            await t.rollback();
            return res.status(400).json({ error: `A period can hold at most ${MAX_ENTRIES_PER_CELL} entries` });
        }
        const dup = existing.find(e => e.subject_id === subject_id && e.instructor_id === instructor_id);
        if (dup) {
            await t.rollback();
            return res.status(400).json({ error: "This instructor is already assigned to this subject in this period" });
        }

        // Same instructor, same day, same period, but a DIFFERENT section.
        const clash = await TimeTableEntry.findOne({
            where: { time_table_id, day_of_week, time_slot_id, instructor_id, status: 1 },
            include: [{ model: Section, attributes: ["id", "sectionName"] }],
            transaction: t,
        });

        let group_id = null;

        if (clash) {
            const sameSubject = clash.subject_id === subject_id;

            if (!combine) {
                // Not an explicit combine request — surface the conflict so the
                // frontend can offer to combine (only possible if subjects match).
                await t.rollback();
                return res.status(409).json({
                    error: "This instructor is already teaching another class in this period",
                    conflict: {
                        entryId: clash.id,
                        section_id: clash.section_id,
                        sectionName: clash.Section?.sectionName || "",
                        subject_id: clash.subject_id,
                        group_id: clash.group_id,
                    },
                    canCombine: sameSubject,
                });
            }

            if (!sameSubject) {
                await t.rollback();
                return res.status(400).json({ error: "Can't combine — the existing class is a different subject" });
            }

            // Reuse the clashing entry's group id, or start a new one and
            // stamp it onto that entry too so both sides share it.
            group_id = clash.group_id || crypto.randomUUID();
            if (!clash.group_id) {
                await clash.update({ group_id }, { transaction: t });
            }
        }

        const entry = await TimeTableEntry.create(
            { time_table_id, section_id, day_of_week, time_slot_id, subject_id, instructor_id, status: 1, group_id },
            { transaction: t }
        );

        await t.commit();

        let groupSections = [];
        if (group_id) {
            const groupEntries = await TimeTableEntry.findAll({
                where: { group_id, status: 1 },
                include: [{ model: Section, attributes: ["id", "sectionName"] }],
            });
            groupSections = groupEntries.map(e => ({ id: e.Section?.id, name: e.Section?.sectionName }));
        }

        res.status(201).json({ message: "Assignment added", entry, groupSections });
    } catch (error) {
        await t.rollback();
        console.error("Error adding timetable entry:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Soft-deletes one entry. If it was part of a combined group and only one
// active entry is left afterward, that remaining entry is no longer really
// "combined" with anything, so its group_id is cleared too.
controller.deleteTimeTableEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await TimeTableEntry.findByPk(id);
        if (!entry) return res.status(404).json({ error: "Entry not found" });

        const group_id = entry.group_id;
        await entry.update({ status: 0 });

        if (group_id) {
            const remaining = await TimeTableEntry.findAll({ where: { group_id, status: 1 } });
            if (remaining.length <= 1) {
                await Promise.all(remaining.map(e => e.update({ group_id: null })));
            }
        }

        res.status(200).json({ message: "Assignment removed" });
    } catch (error) {
        console.error("Error deleting timetable entry:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

controller.getEntriesForSection = async (req, res) => {
    try {
        const { time_table_id, section_id } = req.params;
        const entries = await TimeTableEntry.findAll({
            where: { time_table_id, section_id, status: 1 },
            include: [
                { model: Subject, attributes: ["id", "subjectName", "shortCode"] },
                { model: Instructor, attributes: ["id", "name"] },
                { model: TimeSlot, attributes: ["id", "name", "start_time", "end_time"] },
            ],
        });
        res.status(200).json({ entries });
    } catch (error) {
        console.error("Error fetching timetable entries:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /timetable/getGroupSections/:group_id — which sections a combined
// class spans, e.g. to show "Combined with Grade 2 - B" in the UI.
controller.getGroupSections = async (req, res) => {
    try {
        const { group_id } = req.params;
        const entries = await TimeTableEntry.findAll({
            where: { group_id, status: 1 },
            include: [{ model: Section, attributes: ["id", "sectionName"] }],
        });
        res.status(200).json({ sections: entries.map(e => ({ id: e.Section?.id, name: e.Section?.sectionName })) });
    } catch (error) {
        console.error("Error fetching combined group sections:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = controller;