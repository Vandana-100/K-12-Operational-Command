const express = require("express");
const db = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");
const { testConnection, hasApiKey } = require("../services/geminiService");

const router = express.Router();

// GET /api/settings/thresholds
router.get("/settings/thresholds", authenticateToken, (req, res) => {
  try {
    const thresholds = db.prepare("SELECT * FROM thresholds ORDER BY id ASC").all();
    res.json(thresholds);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch operational thresholds" });
  }
});

// PUT /api/settings/thresholds/:key
router.put("/settings/thresholds/:key", authenticateToken, authorizeRoles("Operations Admin"), (req, res) => {
  try {
    const { key } = req.params;
    const { warning_value, critical_value } = req.body;

    const existing = db.prepare("SELECT * FROM thresholds WHERE key = ?").get(key);
    if (!existing) {
      return res.status(404).json({ message: "Threshold setting not found" });
    }

    db.prepare(`
      UPDATE thresholds
      SET warning_value = ?, critical_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE key = ?
    `).run(Number(warning_value), Number(critical_value), req.user.name, key);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "THRESHOLD_UPDATE",
      entity: "Threshold",
      entityId: key,
      details: `Updated ${existing.name}: Warning -> ${warning_value}, Critical -> ${critical_value}`,
      status: "Success"
    });

    const updated = db.prepare("SELECT * FROM thresholds WHERE key = ?").get(key);
    res.json({ message: "Threshold updated successfully", threshold: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update threshold" });
  }
});

// GET /api/settings/campuses
router.get("/settings/campuses", authenticateToken, (req, res) => {
  try {
    const campuses = db.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM students WHERE campus_id = c.id) as student_count,
             (SELECT COUNT(*) FROM teachers WHERE campus_id = c.id) as teacher_count
      FROM campuses c
    `).all();
    res.json(campuses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch campuses" });
  }
});

// GET /api/settings/ai/status
router.get("/settings/ai/status", authenticateToken, async (req, res) => {
  try {
    const status = await testConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: "Failed to query AI engine status" });
  }
});

// POST /api/settings/ai/test
router.post("/settings/ai/test", authenticateToken, authorizeRoles("Operations Admin", "Operations Manager"), async (req, res) => {
  try {
    const result = await testConnection();

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "AI_CONNECTION_TEST",
      entity: "Settings",
      details: `Tested AI engine: mode=${result.mode}, model=${result.model}`,
      status: "Success"
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to test AI connection" });
  }
});

module.exports = router;
