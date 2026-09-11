const express = require("express");
const db = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// GET /api/reports/summary
router.get("/reports/summary", authenticateToken, (req, res) => {
  try {
    const { campusId, dateRange } = req.query;

    const studentTotal = db.prepare("SELECT COUNT(*) as count, AVG(attendance_rate) as att, AVG(learning_score) as lrn FROM students").get();
    const teacherStats = db.prepare("SELECT COUNT(*) as count, AVG(workload_hours) as hrs FROM teachers").get();
    const workflowStats = db.prepare(`
      SELECT domain, COUNT(*) as total,
             SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
             SUM(CASE WHEN sla_risk = 'Breached' THEN 1 ELSE 0 END) as breached
      FROM workflow_queues
      GROUP BY domain
    `).all();

    res.json({
      reportingPeriod: dateRange || "Term 1 (Aug - Dec 2026)",
      campusScope: campusId ? `Campus #${campusId}` : "All District Campuses",
      kpis: {
        totalEnrolled: studentTotal.count,
        districtAttendanceRate: Number((studentTotal.att || 85.2).toFixed(1)),
        averageLearningScore: Number((studentTotal.lrn || 78.5).toFixed(1)),
        totalFaculty: teacherStats.count,
        averageFacultyWorkload: Number((teacherStats.hrs || 33.2).toFixed(1))
      },
      workflowSummary: workflowStats,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate report summary" });
  }
});

// GET /api/reports/export/csv
// Generates and streams downloadable CSV
router.get("/reports/export/csv", authenticateToken, (req, res) => {
  try {
    const { reportType = "workflows" } = req.query;

    let csvContent = "";
    let filename = `k12_report_${reportType}_${Date.now()}.csv`;

    if (reportType === "workflows") {
      const rows = db.prepare(`
        SELECT id, domain, title, priority, status, owner_name, due_time, sla_risk, created_at
        FROM workflow_queues
        ORDER BY id ASC
      `).all();

      csvContent = "ID,Domain,Title,Priority,Status,Owner,Due Time,SLA Risk,Created At\n";
      rows.forEach(r => {
        csvContent += `"${r.id}","${r.domain}","${r.title.replace(/"/g, '""')}","${r.priority}","${r.status}","${r.owner_name || ''}","${r.due_time || ''}","${r.sla_risk}","${r.created_at}"\n`;
      });
    } else if (reportType === "students") {
      const rows = db.prepare(`
        SELECT student_id, name, grade, class_name, attendance_rate, learning_score, risk_tier, guardian_name
        FROM students
        ORDER BY grade ASC, name ASC
      `).all();

      csvContent = "Student ID,Name,Grade,Class,Attendance Rate %,Learning Score,Risk Tier,Guardian Name\n";
      rows.forEach(r => {
        csvContent += `"${r.student_id}","${r.name}","${r.grade}","${r.class_name}","${r.attendance_rate}","${r.learning_score}","${r.risk_tier}","${r.guardian_name || ''}"\n`;
      });
    } else if (reportType === "teachers") {
      const rows = db.prepare(`
        SELECT id, name, department, subject, workload_hours, max_capacity_hours, status
        FROM teachers
      `).all();

      csvContent = "ID,Name,Department,Subject,Workload Hours,Max Capacity Hours,Status\n";
      rows.forEach(r => {
        csvContent += `"${r.id}","${r.name}","${r.department}","${r.subject}","${r.workload_hours}","${r.max_capacity_hours}","${r.status}"\n`;
      });
    } else {
      // General KPI Digest
      csvContent = "Metric,Current Value,Target / Baseline,Status\n";
      csvContent += '"District Student Attendance","84.8%","92.0%","Warning - Seasonal Decline"\n';
      csvContent += '"Average Faculty Workload","33.2h / week","35.0h max","Normal"\n';
      csvContent += '"Parent Inquiry Turnaround SLA","28.4h","24.0h target","At Risk"\n';
      csvContent += '"Intervention Program Completion","74.5%","90.0%","Improving"\n';
    }

    // Save report export to history
    db.prepare(`
      INSERT INTO reports_history (title, report_type, filters_applied, file_format, generated_by)
      VALUES (?, ?, ?, 'CSV', ?)
    `).run(
      `Operational Digest: ${reportType.toUpperCase()}`,
      reportType,
      JSON.stringify(req.query),
      req.user.name
    );

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "REPORT_EXPORT",
      entity: "Report",
      details: `Exported ${reportType} report as CSV`,
      status: "Success"
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("CSV Export error:", error);
    res.status(500).json({ message: "Failed to export CSV report" });
  }
});

// GET /api/reports/history
router.get("/reports/history", authenticateToken, (req, res) => {
  try {
    const history = db.prepare("SELECT * FROM reports_history ORDER BY id DESC LIMIT 20").all();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to load reports history" });
  }
});

// POST /api/reports/generate
router.post("/reports/generate", authenticateToken, (req, res) => {
  try {
    const { title, reportType, filters } = req.body;

    const result = db.prepare(`
      INSERT INTO reports_history (title, report_type, filters_applied, file_format, generated_by)
      VALUES (?, ?, ?, 'CSV', ?)
    `).run(
      title || "Executive Operations Summary",
      reportType || "executive",
      JSON.stringify(filters || {}),
      req.user.name
    );

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "REPORT_GENERATE",
      entity: "Report",
      entityId: result.lastInsertRowid,
      details: `Generated operational report '${title}'`,
      status: "Success"
    });

    res.status(201).json({
      message: "Report generated successfully",
      reportId: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to schedule report" });
  }
});

module.exports = router;
