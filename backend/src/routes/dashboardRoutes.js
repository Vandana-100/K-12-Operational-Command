const express = require("express");
const db = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { getKPISnapshots } = require("../services/forecastEngine");

const router = express.Router();

// GET /api/dashboard
router.get("/dashboard", authenticateToken, (req, res) => {
  try {
    const campusId = req.query.campusId ? Number(req.query.campusId) : null;
    const snapshots = getKPISnapshots(campusId);

    // Also get quick alert ticker items
    const activeAlerts = db.prepare(`
      SELECT id, domain, title, priority, due_time, sla_risk
      FROM workflow_queues
      WHERE sla_risk IN ('At Risk', 'Breached')
      ORDER BY id DESC
      LIMIT 5
    `).all();

    // Campuses list for the filter dropdown
    const campuses = db.prepare("SELECT id, name, code, city FROM campuses").all();

    res.json({
      ...snapshots,
      activeAlerts,
      campuses,
      selectedCampusId: campusId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Dashboard route error:", error);
    res.status(500).json({ message: "Failed to load dashboard metrics" });
  }
});

// GET /api/dashboard/trends
router.get("/dashboard/trends", authenticateToken, (req, res) => {
  try {
    const campusId = req.query.campusId ? Number(req.query.campusId) : null;
    const campusFilter = campusId ? "WHERE campus_id = ?" : "";
    const params = campusId ? [campusId] : [];

    // 14 days historical attendance
    const attendanceHistory = db.prepare(`
      SELECT attendance_date, AVG(attendance_rate) as attendance_rate
      FROM attendance_history
      ${campusFilter}
      GROUP BY attendance_date
      ORDER BY attendance_date ASC
    `).all(...params);

    // Multi-metric historical and simulated series
    const dates = attendanceHistory.map(h => h.attendance_date);
    const trendData = dates.map((date, idx) => {
      const attRate = attendanceHistory[idx]?.attendance_rate || 88;
      return {
        date: date.slice(5), // MM-DD
        fullDate: date,
        attendance: Number(attRate.toFixed(1)),
        learningProgress: Number((76 + idx * 0.4).toFixed(1)),
        assessmentScore: Number((74 + (idx % 3) * 1.8).toFixed(1)),
        teacherWorkload: Number((32 + (idx > 7 ? 3.5 : 1.2)).toFixed(1)),
        parentSlaHours: Number((22 + (idx > 8 ? 8.2 : 1.5)).toFixed(1)),
        interventionCompletion: Number((70 + idx * 0.8).toFixed(1))
      };
    });

    res.json(trendData);
  } catch (error) {
    console.error("Trends route error:", error);
    res.status(500).json({ message: "Failed to load trend analytics" });
  }
});

module.exports = router;