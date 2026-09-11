const express = require("express");
const db = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");
const { scanAnomalies } = require("../services/anomalyEngine");

const router = express.Router();

// GET /api/anomalies
router.get("/anomalies", authenticateToken, (req, res) => {
  try {
    const anomalies = db.prepare("SELECT * FROM anomalies ORDER BY id DESC").all();

    const formatted = anomalies.map(a => {
      let factors = [];
      try {
        factors = JSON.parse(a.contributing_factors || "[]");
      } catch (e) {
        factors = [];
      }
      return {
        ...a,
        contributing_factors: factors
      };
    });

    res.json({
      anomalies: formatted,
      count: formatted.length,
      criticalCount: formatted.filter(a => a.severity === "Critical").length,
      highCount: formatted.filter(a => a.severity === "High").length
    });
  } catch (error) {
    console.error("Fetch anomalies error:", error);
    res.status(500).json({ message: "Failed to fetch anomalies" });
  }
});

// GET /api/anomalies/comparison
// Predicted vs Actual Outcomes table
router.get("/anomalies/comparison", authenticateToken, (req, res) => {
  try {
    const comparisons = [
      {
        metric: "Term 1 Daily Student Attendance",
        domain: "Attendance",
        predicted: 83.6,
        actual: 84.8,
        difference: "+1.2%",
        accuracyPct: 98.6,
        status: "Within Margin",
        evaluatedDate: "2026-09-11"
      },
      {
        metric: "STEM Teacher Workload Hours",
        domain: "Teaching",
        predicted: 37.8,
        actual: 38.0,
        difference: "+0.2h",
        accuracyPct: 99.5,
        status: "Critical Alert Confirmed",
        evaluatedDate: "2026-09-10"
      },
      {
        metric: "Parent Inquiry Resolution Latency",
        domain: "Parent Communication",
        predicted: 36.0,
        actual: 38.5,
        difference: "+2.5h",
        accuracyPct: 93.1,
        status: "SLA Breach Confirmed",
        evaluatedDate: "2026-09-09"
      },
      {
        metric: "Grade 11 Commerce Assessment Failure Rate",
        domain: "Assessment",
        predicted: 30.0,
        actual: 34.0,
        difference: "+4.0%",
        accuracyPct: 86.7,
        status: "Elevated Risk",
        evaluatedDate: "2026-09-08"
      }
    ];

    res.json(comparisons);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comparison data" });
  }
});

// POST /api/anomalies/detect
router.post("/anomalies/detect", authenticateToken, async (req, res) => {
  try {
    const newAnomalies = await scanAnomalies();
    
    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "ANOMALY_SCAN",
      entity: "Anomalies",
      details: `Triggered anomaly scan. Found ${newAnomalies.length} operational deviations.`,
      status: "Success"
    });

    res.json({
      message: `Anomaly scan completed. ${newAnomalies.length} active patterns analyzed.`,
      detected: newAnomalies
    });
  } catch (error) {
    console.error("Anomaly scan error:", error);
    res.status(500).json({ message: "Failed to run anomaly scan" });
  }
});

// PUT /api/anomalies/:id/acknowledge
router.put(
  "/anomalies/:id/acknowledge",
  authenticateToken,
  authorizeRoles("Operations Admin", "Operations Manager"),
  (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      db.prepare("UPDATE anomalies SET status = 'Acknowledged' WHERE id = ?").run(id);

      logAudit({
        userId: req.user.userId,
        userName: req.user.name,
        role: req.user.role,
        action: "ANOMALY_ACKNOWLEDGE",
        entity: "Anomaly",
        entityId: id,
        details: `Acknowledged anomaly #${id}: ${notes || "Acknowledged by reviewer"}`,
        status: "Success"
      });

      res.json({ message: "Anomaly marked as acknowledged", id });
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge anomaly" });
    }
  }
);

module.exports = router;