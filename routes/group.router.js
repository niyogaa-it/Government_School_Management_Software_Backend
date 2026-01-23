const express = require("express");
const router = express.Router();
const groupController = require("../controllers/group.controller");

router.post("/createGroup", groupController.createGroup);
router.get("/getAllGroups", groupController.getAllGroups);
router.get("/getGroupsBySchool/:school_id", groupController.getGroupsBySchool);
router.put("/updateGroup/:id", groupController.updateGroup);
router.get("/getGroup/:id", groupController.getGroupById);
router.delete("/deleteGroup/:id", groupController.deleteGroup);
// router.get("/getGroupsBySchoolAndGrade/:school_id/:grade_id", groupController.getGroupsBySchoolAndGrade);

module.exports = router;