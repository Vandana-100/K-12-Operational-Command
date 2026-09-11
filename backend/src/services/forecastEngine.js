const db = require("../db/database");

/**
 * Calculates linear regression trend on an array of numbers.
 */
function calculateTrend(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Generates 30-day projection points with upper and lower confidence intervals.
 */
function generateProjectionSeries(historyValues, daysAhead = 14) {
  const { slope, intercept } = calculateTrend(historyValues);
  const n = historyValues.length;
  const lastVal = historyValues[n - 1] || 85;

  // Calculate variance for confidence bounds
  const residuals = historyValues.map((y, i) => y - (intercept + slope * i));
  const variance = residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, n - 2);
  const stdErr = Math.sqrt(variance) || 1.5;

  const series = [];
  for (let i = 1; i <= daysAhead; i++) {
    const rawVal = lastVal + slope * i;
    const projected = Math.min(100, Math.max(40, Number(rawVal.toFixed(1))));
    const uncertainty = Number((stdErr * Math.sqrt(1 + i / n) * 1.96).toFixed(1));
    
    series.push({
      day: `+${i}d`,
      projected,
      lowerBound: Math.max(0, Number((projected - uncertainty).toFixed(1))),
      upperBound: Math.min(100, Number((projected + uncertainty).toFixed(1)))
    });
  }

  return series;
}

/**
 * Retrieves KPI snapshots for dashboard cards.
 */
function getKPISnapshots(campusId = null) {
  const campusFilter = campusId ? "WHERE campus_id = ?" : "";
  const params = campusId ? [campusId] : [];

  // Enrolment & Capacity
  const studentCount = db.prepare(`SELECT COUNT(*) as count FROM students ${campusFilter}`).get(...params)?.count || 0;
  const capacityQuery = campusId 
    ? db.prepare("SELECT student_capacity FROM campuses WHERE id = ?").get(campusId)?.student_capacity || 1000
    : db.prepare("SELECT SUM(student_capacity) as cap FROM campuses").get()?.cap || 3650;
  
  // Attendance Average
  const attendanceAvg = db.prepare(`SELECT AVG(attendance_rate) as avg FROM students ${campusFilter}`).get(...params)?.avg || 85.5;

  // Learning Score Average
  const learningAvg = db.prepare(`SELECT AVG(learning_score) as avg FROM students ${campusFilter}`).get(...params)?.avg || 78.2;

  // Assessment Performance Average
  const assessmentQuery = campusId
    ? `SELECT AVG(a.score) as avg FROM assessments a JOIN students s ON a.student_id = s.id WHERE s.campus_id = ?`
    : `SELECT AVG(score) as avg FROM assessments`;
  const assessmentAvg = db.prepare(assessmentQuery).get(...params)?.avg || 76.4;

  // Teacher Workload Average
  const teacherQuery = campusId
    ? `SELECT AVG(workload_hours) as avg, COUNT(*) as total FROM teachers WHERE campus_id = ?`
    : `SELECT AVG(workload_hours) as avg, COUNT(*) as total FROM teachers`;
  const teacherStats = db.prepare(teacherQuery).get(...params) || { avg: 33.2, total: 10 };

  // Support Intervention Active Cases
  const interventionCount = db.prepare(`
    SELECT COUNT(*) as count FROM students 
    WHERE risk_tier IN ('High', 'Critical') ${campusId ? "AND campus_id = ?" : ""}
  `).get(...params)?.count || 5;

  // Parent SLA & Inquiry Count
  const parentInquiries = db.prepare(`
    SELECT COUNT(*) as count FROM workflow_queues 
    WHERE domain = 'Parent Communication' AND status != 'Resolved' ${campusId ? "AND campus_id = ?" : ""}
  `).get(...params)?.count || 3;

  // SLA Breached or At Risk count
  const atRiskCount = db.prepare(`
    SELECT COUNT(*) as count FROM workflow_queues 
    WHERE sla_risk IN ('At Risk', 'Breached') ${campusId ? "AND campus_id = ?" : ""}
  `).get(...params)?.count || 0;

  return {
    enrollment: {
      total: studentCount,
      capacity: capacityQuery,
      utilizationRate: Number(((studentCount / capacityQuery) * 100).toFixed(1)),
      trend: "+4.2% vs last term"
    },
    attendance: {
      currentRate: Number(attendanceAvg.toFixed(1)),
      targetRate: 92.0,
      trend: "-1.8% vs last week",
      chronicAbsenceCount: db.prepare(`SELECT COUNT(*) as count FROM students WHERE attendance_rate < 80 ${campusId ? "AND campus_id = ?" : ""}`).get(...params)?.count || 3
    },
    learningProgress: {
      averageScore: Number(learningAvg.toFixed(1)),
      targetScore: 85.0,
      trend: "+1.5% this month",
      atRiskCount: interventionCount
    },
    assessmentPerformance: {
      averageScore: Number(assessmentAvg.toFixed(1)),
      passRate: 88.4,
      trend: "-2.1% (pre-midterms)"
    },
    teacherWorkload: {
      averageHours: Number(teacherStats.avg.toFixed(1)),
      maxCapacityHours: 35.0,
      overloadedTeachers: db.prepare(`SELECT COUNT(*) as count FROM teachers WHERE workload_hours > 35.0 ${campusId ? "AND campus_id = ?" : ""}`).get(...params)?.count || 2
    },
    interventionCompletion: {
      completionRate: 74.5,
      activeCases: interventionCount,
      targetRate: 90.0,
      trend: "+6.0% resolved"
    },
    parentResponse: {
      avgResponseHours: 28.4,
      slaTargetHours: 24.0,
      openTickets: parentInquiries,
      slaComplianceRate: 82.0
    },
    operationalSummary: {
      activeSlaAlerts: atRiskCount,
      systemHealth: atRiskCount > 4 ? "Degraded" : atRiskCount > 1 ? "Attention Required" : "Optimal"
    }
  };
}

/**
 * Returns Capacity Heatmaps for Teachers and Classrooms.
 */
function getCapacityHeatmaps(campusId = null) {
  const teacherFilter = campusId ? "WHERE campus_id = ?" : "";
  const teachers = db.prepare(`SELECT name, subject, workload_hours, max_capacity_hours FROM teachers ${teacherFilter}`).all(...(campusId ? [campusId] : []));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const teacherHeatmap = teachers.map(t => {
    const dailyBase = t.workload_hours / 5;
    return {
      teacherName: t.name,
      subject: t.subject,
      totalHours: t.workload_hours,
      overloaded: t.workload_hours > t.max_capacity_hours,
      schedule: days.map((day, idx) => {
        // distribute with slight variance per day
        const variance = (idx === 1 || idx === 3) ? 1.2 : -0.8;
        const dailyHours = Number(Math.max(4, Math.min(9, dailyBase + variance)).toFixed(1));
        return {
          day,
          hours: dailyHours,
          status: dailyHours > 7.5 ? "Critical" : dailyHours > 6.5 ? "Warning" : "Normal"
        };
      })
    };
  });

  // Classroom Period Utilization Heatmap (Periods 1 - 8)
  const roomFilter = campusId ? "WHERE campus_id = ?" : "";
  const rooms = db.prepare(`SELECT DISTINCT room_number, name FROM classes ${roomFilter}`).all(...(campusId ? [campusId] : []));
  
  const roomList = rooms.length > 0 ? rooms : [
    { room_number: "Room 201", name: "Main Hall" },
    { room_number: "Lab 1", name: "Science Lab" },
    { room_number: "Room 304", name: "Language Center" },
    { room_number: "Tech Hall", name: "CS Wing" }
  ];

  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  const roomHeatmap = roomList.map(r => ({
    room: r.room_number,
    label: r.name,
    periods: periods.map(p => {
      // simulate period load
      const isPeak = p === 3 || p === 4 || p === 6;
      const utilPct = isPeak ? (r.room_number === "Lab 1" ? 100 : 85) : Math.floor(40 + Math.random() * 35);
      return {
        period: `P${p}`,
        utilizationPct: utilPct,
        status: utilPct >= 95 ? "Conflict/Overload" : utilPct >= 80 ? "High Utilization" : "Available"
      };
    })
  }));

  return {
    teacherHeatmap,
    roomHeatmap
  };
}

module.exports = {
  getKPISnapshots,
  getCapacityHeatmaps,
  generateProjectionSeries,
  calculateTrend
};
