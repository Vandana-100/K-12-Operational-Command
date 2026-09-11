const express = require("express");
const db = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/audit
// Searchable immutable audit logs
router.get("/audit", authenticateToken, authorizeRoles("Operations Admin", "Operations Manager", "Operations Analyst"), (req, res) => {
  try {
    const { action, role, entity, status, search, limit = 50, offset = 0 } = req.query;

    let query = "SELECT * FROM audit_logs WHERE 1=1";
    const params = [];

    if (action && action !== "All") {
      query += " AND action LIKE ?";
      params.push(`%${action}%`);
    }
    if (role && role !== "All") {
      query += " AND role = ?";
      params.push(role);
    }
    if (entity && entity !== "All") {
      query += " AND entity = ?";
      params.push(entity);
    }
    if (status && status !== "All") {
      query += " AND status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (user_name LIKE ? OR details LIKE ? OR action LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const logs = db.prepare(query).all(...params);

    const totalCount = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get()?.count || 0;

    // Distinct actions and entities for filter dropdowns
    const actions = db.prepare("SELECT DISTINCT action FROM audit_logs ORDER BY action ASC").all().map(r => r.action);
    const entities = db.prepare("SELECT DISTINCT entity FROM audit_logs ORDER BY entity ASC").all().map(r => r.entity);

    res.json({
      logs,
      totalCount,
      actions,
      entities,
      retentionPolicy: "365-Day Immutable Compliance Storage Active"
    });
  } catch (error) {
    console.error("Audit log error:", error);
    res.status(500).json({ message: "Failed to query audit logs" });
  }
});

module.exports = router;
