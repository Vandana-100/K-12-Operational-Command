const express = require("express");
const db = require("../db/database");

const router = express.Router();

router.get("/students", (req, res) => {
  try {
    const students = db.prepare("SELECT * FROM students").all();

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch students"
    });
  }
});

module.exports = router;