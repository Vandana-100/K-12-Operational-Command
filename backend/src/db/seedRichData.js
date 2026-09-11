const bcrypt = require("bcryptjs");
const db = require("./database");

console.log("Seeding rich K-12 operational data...");

// Clear existing tables in correct order
const tablesToClear = [
  "task_history", "tasks", "workflow_history", "workflow_queues", 
  "assessments", "attendance", "attendance_history", "guardians", 
  "classes", "teachers", "students", "user_feedback", "preventive_actions",
  "anomalies", "predictions", "scenarios", "thresholds", "notifications",
  "notification_preferences", "audit_logs", "reports_history", "users", "campuses"
];

for (const tbl of tablesToClear) {
  try {
    db.prepare(`DELETE FROM ${tbl}`).run();
  } catch (err) {
    // ignore if table doesn't exist yet
  }
}

// ----------------------------------------------------
// 1. CAMPUSES
// ----------------------------------------------------
const insertCampus = db.prepare(`
  INSERT INTO campuses (name, code, city, student_capacity)
  VALUES (?, ?, ?, ?)
`);

const campuses = [
  ["Horizon North Academy", "HNA", "North District", 1200],
  ["Oakridge Central Campus", "OCC", "Central Metro", 1500],
  ["Riverdale West Campus", "RWC", "West Suburbs", 950]
];

const campusIds = [];
for (const c of campuses) {
  const res = insertCampus.run(...c);
  campusIds.push(res.lastInsertRowid);
}

// ----------------------------------------------------
// 2. USERS (4 Distinct Project Roles)
// ----------------------------------------------------
const passwordHash = bcrypt.hashSync("admin123", 10);
const insertUser = db.prepare(`
  INSERT INTO users (name, email, password, role, campus_id, department, status, last_login)
  VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
`);

const users = [
  ["Elena Rostova", "admin@school.com", passwordHash, "Operations Admin", campusIds[0], "Executive Operations"],
  ["Marcus Vance", "manager@school.com", passwordHash, "Operations Manager", campusIds[1], "Academic Services"],
  ["Sarah Chen", "analyst@school.com", passwordHash, "Operations Analyst", campusIds[0], "Analytics & Planning"],
  ["David Miller", "staff@school.com", passwordHash, "Field Staff", campusIds[2], "Student Support"]
];

const userIds = [];
for (const u of users) {
  const res = insertUser.run(...u);
  userIds.push(res.lastInsertRowid);
  
  // Create notification preferences
  db.prepare(`
    INSERT INTO notification_preferences (user_id, email_alerts, in_app_alerts, sla_critical, anomalies, task_updates)
    VALUES (?, 1, 1, 1, 1, 1)
  `).run(res.lastInsertRowid);
}

// ----------------------------------------------------
// 3. TEACHERS
// ----------------------------------------------------
const insertTeacher = db.prepare(`
  INSERT INTO teachers (name, campus_id, department, subject, workload_hours, max_capacity_hours, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const teachers = [
  ["Dr. Ramesh Nair", campusIds[0], "STEM", "Mathematics", 36.5, 35, "Active"],
  ["Priya Sharma", campusIds[0], "STEM", "Science & Physics", 34.0, 35, "Active"],
  ["Anil Reddy", campusIds[1], "Humanities", "English Literature", 31.0, 35, "Active"],
  ["Sneha Rao", campusIds[1], "Humanities", "Social Studies", 28.5, 35, "Active"],
  ["Kiran Singh", campusIds[2], "Technology", "Computer Science", 38.0, 35, "Active"],
  ["Maria Gonzalez", campusIds[0], "Languages", "Spanish", 26.0, 35, "Active"],
  ["James O'Connor", campusIds[1], "STEM", "Biology & Chemistry", 35.5, 35, "Active"],
  ["Amina Al-Mansoor", campusIds[2], "Arts", "Visual Arts", 24.0, 35, "Active"],
  ["Robert Chen", campusIds[0], "Humanities", "World History", 33.0, 35, "Active"],
  ["Fatima Patel", campusIds[1], "STEM", "Advanced Mathematics", 37.0, 35, "Active"]
];

const teacherIds = [];
for (const t of teachers) {
  const res = insertTeacher.run(...t);
  teacherIds.push(res.lastInsertRowid);
}

// ----------------------------------------------------
// 4. STUDENTS & GUARDIANS
// ----------------------------------------------------
const insertStudent = db.prepare(`
  INSERT INTO students (student_id, name, campus_id, grade, class_name, attendance_rate, learning_score, guardian_name, guardian_email, guardian_phone, risk_tier)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const studentData = [
  ["STU-1001", "Aarav Sharma", campusIds[0], 10, "Grade 10-A", 82.5, 68.0, "Sunita Sharma", "sunita.s@example.com", "+1-555-0101", "High"],
  ["STU-1002", "Ananya Verma", campusIds[0], 10, "Grade 10-A", 94.0, 88.5, "Rajesh Verma", "rajesh.v@example.com", "+1-555-0102", "Low"],
  ["STU-1003", "Rohan Mehta", campusIds[0], 10, "Grade 10-B", 78.0, 62.0, "Deepak Mehta", "deepak.m@example.com", "+1-555-0103", "High"],
  ["STU-1004", "Isha Iyer", campusIds[0], 9, "Grade 9-A", 96.5, 94.0, "Kavita Iyer", "kavita.i@example.com", "+1-555-0104", "Low"],
  ["STU-1005", "Kabir Joshi", campusIds[0], 9, "Grade 9-B", 85.0, 74.0, "Manoj Joshi", "manoj.j@example.com", "+1-555-0105", "Medium"],
  
  ["STU-1006", "Diya Kapoor", campusIds[1], 11, "Grade 11-Science", 89.0, 81.0, "Vikram Kapoor", "vikram.k@example.com", "+1-555-0106", "Low"],
  ["STU-1007", "Arjun Nair", campusIds[1], 11, "Grade 11-Commerce", 74.5, 59.5, "Geeta Nair", "geeta.n@example.com", "+1-555-0107", "Critical"],
  ["STU-1008", "Meera Pillai", campusIds[1], 12, "Grade 12-Science", 92.0, 89.0, "Suresh Pillai", "suresh.p@example.com", "+1-555-0108", "Low"],
  ["STU-1009", "Dev Patel", campusIds[1], 12, "Grade 12-Arts", 81.0, 70.5, "Nita Patel", "nita.p@example.com", "+1-555-0109", "Medium"],
  ["STU-1010", "Zoya Khan", campusIds[1], 8, "Grade 8-A", 91.5, 86.0, "Tariq Khan", "tariq.k@example.com", "+1-555-0110", "Low"],

  ["STU-1011", "Lucas Silva", campusIds[2], 7, "Grade 7-A", 87.0, 77.0, "Helena Silva", "helena.s@example.com", "+1-555-0111", "Medium"],
  ["STU-1012", "Maya Lin", campusIds[2], 7, "Grade 7-B", 97.0, 95.0, "Wei Lin", "wei.l@example.com", "+1-555-0112", "Low"],
  ["STU-1013", "Ethan Wright", campusIds[2], 8, "Grade 8-A", 76.0, 64.0, "Karen Wright", "karen.w@example.com", "+1-555-0113", "High"],
  ["STU-1014", "Chloe Bennett", campusIds[2], 9, "Grade 9-A", 88.5, 82.0, "Thomas Bennett", "thomas.b@example.com", "+1-555-0114", "Low"],
  ["STU-1015", "Noah Adams", campusIds[2], 10, "Grade 10-A", 79.5, 69.0, "Sarah Adams", "sarah.a@example.com", "+1-555-0115", "High"]
];

const studentIds = [];
for (const s of studentData) {
  const res = insertStudent.run(...s);
  studentIds.push(res.lastInsertRowid);
}

// ----------------------------------------------------
// 5. CLASSES
// ----------------------------------------------------
const insertClass = db.prepare(`
  INSERT INTO classes (name, campus_id, grade, room_number, teacher_id, capacity, enrolled_count)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const classes = [
  ["Grade 10-A Math", campusIds[0], 10, "Room 201", teacherIds[0], 32, 30],
  ["Grade 10-B Science", campusIds[0], 10, "Lab 1", teacherIds[1], 28, 27],
  ["Grade 11 English", campusIds[1], 11, "Room 304", teacherIds[2], 35, 34],
  ["Grade 11 Social Studies", campusIds[1], 11, "Room 102", teacherIds[3], 30, 26],
  ["Grade 8 CS Lab", campusIds[2], 8, "Tech Hall", teacherIds[4], 25, 25]
];

for (const cl of classes) {
  insertClass.run(...cl);
}

// ----------------------------------------------------
// 6. HISTORICAL ATTENDANCE (14 Days Trend)
// ----------------------------------------------------
const insertAttHistory = db.prepare(`
  INSERT INTO attendance_history (campus_id, attendance_date, attendance_rate, chronic_absence_count)
  VALUES (?, ?, ?, ?)
`);

const dates = [
  "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29",
  "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
  "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"
];

const rates = [93.4, 92.8, 92.1, 91.5, 90.8, 90.2, 89.6, 88.9, 88.0, 87.4, 86.8, 86.1, 85.4, 84.8];

for (let i = 0; i < dates.length; i++) {
  insertAttHistory.run(campusIds[0], dates[i], rates[i], Math.round((100 - rates[i]) * 1.5));
  insertAttHistory.run(campusIds[1], dates[i], rates[i] + 2.5, Math.round((100 - rates[i] - 2) * 1.2));
  insertAttHistory.run(campusIds[2], dates[i], rates[i] + 1.2, Math.round((100 - rates[i] - 1) * 1.3));
}

// ----------------------------------------------------
// 7. ASSESSMENTS
// ----------------------------------------------------
const insertAssessment = db.prepare(`
  INSERT INTO assessments (student_id, subject, score, max_score, assessment_date, term, status)
  VALUES (?, ?, ?, 100, ?, 'Term 1', 'Completed')
`);

for (let i = 0; i < studentIds.length; i++) {
  const sid = studentIds[i];
  const sRate = studentData[i][6]; // learning_score
  insertAssessment.run(sid, "Mathematics", Math.max(45, Math.min(100, sRate + (Math.random() * 8 - 4))), "2026-09-02");
  insertAssessment.run(sid, "Science", Math.max(50, Math.min(100, sRate + (Math.random() * 10 - 3))), "2026-09-04");
  insertAssessment.run(sid, "English", Math.max(55, Math.min(100, sRate + (Math.random() * 6 - 2))), "2026-09-08");
}

// ----------------------------------------------------
// 8. LIVE WORKFLOW QUEUES (All 8 Core Domains)
// ----------------------------------------------------
const insertWorkflow = db.prepare(`
  INSERT INTO workflow_queues (domain, title, description, priority, status, owner_id, owner_name, campus_id, due_time, sla_risk, linked_entity_type, linked_entity_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const workflows = [
  // 1. Admission
  ["Admission", "Grade 10 Transfer Influx Document Verification", "14 mid-term transfer applications pending verification for Horizon North", "High", "In Progress", userIds[1], "Marcus Vance", campusIds[0], "Today 16:00", "At Risk", "ApplicationBatch", "ADM-2026-88"],
  ["Admission", "Kindergarten Waitlist Capacity Review", "Analyze room constraints vs waitlist volume of 42 students", "Medium", "Pending", userIds[1], "Marcus Vance", campusIds[2], "Tomorrow 12:00", "On Track", "CampusCapacity", "CAP-RWC-01"],
  
  // 2. Timetable Planning
  ["Timetable Planning", "Grade 10 Lab 1 Room Collision Conflict", "Physics and Chemistry double-booked for Period 4 on Thursday", "Critical", "Pending", userIds[0], "Elena Rostova", campusIds[0], "Today 14:30", "Breached", "Classroom", "Lab 1"],
  ["Timetable Planning", "Teacher Overtime Redistribution (Dr. Nair)", "Workload currently 36.5h against 35h max cap. Shift 2 periods to substitute", "High", "In Progress", userIds[1], "Marcus Vance", campusIds[0], "Tomorrow 10:00", "At Risk", "Teacher", "TCH-001"],

  // 3. Teaching
  ["Teaching", "Grade 11 Mathematics Curriculum Pacing Deficit", "Cohort is 2 chapters behind schedule ahead of October Mid-Terms", "High", "In Progress", userIds[1], "Marcus Vance", campusIds[1], "Sep 15, 17:00", "At Risk", "Curriculum", "MATH-G11"],
  ["Teaching", "Substitute Faculty Allocation - Computer Science", "Kiran Singh on authorized training; coverage needed for 8 lab sessions", "Medium", "Resolved", userIds[3], "David Miller", campusIds[2], "Sep 12, 09:00", "On Track", "Teacher", "TCH-005"],

  // 4. Assessment
  ["Assessment", "Term 1 Science Moderation & Grade Entry Audit", "3 teachers have not submitted moderated marks for Grade 9", "Critical", "Pending", userIds[0], "Elena Rostova", campusIds[0], "Today 18:00", "At Risk", "ExamCycle", "T1-SCI-09"],
  ["Assessment", "Grade 11 Commerce Assessment Underperformance Spike", "34% of students scored below 60% in Accountancy Quiz 2", "High", "In Progress", userIds[2], "Sarah Chen", campusIds[1], "Tomorrow 15:00", "On Track", "AssessmentGroup", "ACC-Q2"],

  // 5. Attendance
  ["Attendance", "Grade 10 Chronic Truancy Pattern Alert", "5 students flagged with >15% unexcused absences in past 10 days", "Critical", "In Progress", userIds[3], "David Miller", campusIds[0], "Today 17:00", "Breached", "StudentCohort", "G10-ATT"],
  ["Attendance", "Post-Holiday Seasonal Absenteeism Pre-Alert", "Historic data indicates expected 8% drop on following Monday", "Low", "Pending", userIds[2], "Sarah Chen", campusIds[1], "Sep 18, 08:30", "On Track", "OperationalForecast", "ATT-PRED-99"],

  // 6. Parent Communication
  ["Parent Communication", "Escalated Grievance: Grade 11 Bus Route Delay", "4 parents lodged formal complaint regarding 45-minute pickup delay", "Critical", "In Progress", userIds[1], "Marcus Vance", campusIds[1], "Today 15:00", "Breached", "Ticket", "PRNT-842"],
  ["Parent Communication", "Parent-Teacher Conference Scheduling Backlog", "62 requests awaiting teacher confirmation for next week's sessions", "Medium", "Pending", userIds[3], "David Miller", campusIds[2], "Sep 14, 16:00", "At Risk", "ConferenceBatch", "PTC-2026-01"],

  // 7. Support Intervention
  ["Support Intervention", "Arjun Nair IEP & Mental Health Support Check-in", "Student attendance at 74.5%, learning score 59.5%. Counsellor review required", "Critical", "In Progress", userIds[3], "David Miller", campusIds[1], "Today 16:30", "At Risk", "Student", "STU-1007"],
  ["Support Intervention", "Remedial Math Cohort Clinic Session 3", "Targeted tutoring for 8 students flagged in Grade 10-B", "High", "Pending", userIds[3], "David Miller", campusIds[0], "Tomorrow 14:00", "On Track", "InterventionGroup", "REM-MATH-10"],

  // 8. Reporting
  ["Reporting", "State Education Board Monthly Safety & Attendance Filing", "Mandatory statutory compliance report due before 15th of the month", "Critical", "Pending", userIds[0], "Elena Rostova", campusIds[0], "Sep 14, 23:59", "At Risk", "StatutoryFiling", "REP-STATE-09"],
  ["Reporting", "Quarterly Operations SLA & Faculty Workload Briefing", "Generate consolidated executive review for board of trustees", "Medium", "In Progress", userIds[2], "Sarah Chen", campusIds[1], "Sep 16, 12:00", "On Track", "ExecutiveReport", "REP-EXEC-Q3"]
];

for (const w of workflows) {
  const res = insertWorkflow.run(...w);
  db.prepare(`
    INSERT INTO workflow_history (workflow_id, user_name, action, notes)
    VALUES (?, ?, 'Created', 'Workflow ticket automatically initiated from operational queue monitoring')
  `).run(res.lastInsertRowid, "System Engine");
}

// ----------------------------------------------------
// 9. TASKS & ACTION TIMELINE
// ----------------------------------------------------
const insertTask = db.prepare(`
  INSERT INTO tasks (title, domain, priority, status, assigned_to, assigned_user_id, due_date, campus_id, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const initialTasks = [
  ["Deploy floating substitute teacher to relieve Dr. Nair", "Teaching", "High", "In Progress", "Marcus Vance", userIds[1], "2026-09-12", campusIds[0], "Approved from AI preventive recommendation #1"],
  ["Send automated SMS alerts to parents of chronic truant students", "Attendance", "Critical", "Open", "David Miller", userIds[3], "2026-09-11", campusIds[0], "5 high-risk truant cases identified in Grade 10"],
  ["Conduct Lab 1 timetable room re-assignment", "Timetable Planning", "Critical", "In Progress", "Elena Rostova", userIds[0], "2026-09-11", campusIds[0], "Resolve room collision between Period 4 Physics & Chem"],
  ["Initiate counsellor 1-on-1 intervention for Arjun Nair", "Support Intervention", "High", "Open", "David Miller", userIds[3], "2026-09-12", campusIds[1], "Attendance below 75%, parent contact requested"],
  ["Prepare Term 1 State Compliance Attendance Digest", "Reporting", "Medium", "Open", "Sarah Chen", userIds[2], "2026-09-14", campusIds[0], "Statutory deadline approaching"]
];

for (const tk of initialTasks) {
  const res = insertTask.run(...tk);
  db.prepare(`
    INSERT INTO task_history (task_id, actor_name, action, old_value, new_value, reason)
    VALUES (?, 'Elena Rostova', 'Assignment', 'Unassigned', ?, 'Assigned based on domain expertise and capacity')
  `).run(res.lastInsertRowid, tk[4]);
}

// ----------------------------------------------------
// 10. PREDICTIONS (Multi-Stream)
// ----------------------------------------------------
const insertPred = db.prepare(`
  INSERT INTO predictions (domain, prediction_type, target_entity, predicted_value, actual_value, confidence, risk_level, explanation, contributing_factors, model_version, snapshot_data, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
`);

const predictions = [
  [
    "Attendance", "Multi-Metric Operational Forecast", "District Wide", 
    83.6, 85.2, 91.5, "High",
    "Continuous daily attendance decline over 14 days (-8.6% drop) driven by seasonal influenza patterns in Grades 9-10.",
    JSON.stringify([
      { factor: "14-Day Attendance Slope", weight: "42%", direction: "Negative" },
      { factor: "Seasonal Flu Incidence", weight: "31%", direction: "Negative" },
      { factor: "Assessment Stress Clusters", weight: "17%", direction: "Negative" }
    ]),
    "gemini-hybrid-v2.4",
    JSON.stringify({ currentAttendance: 85.2, historicMean: 91.4, dropRate: "-0.62%/day" })
  ],
  [
    "Teacher Workload", "Faculty Capacity Burnout Forecast", "Horizon North STEM",
    37.8, 35.2, 88.0, "Critical",
    "STEM faculty average weekly hours approaching 37.8h against 35h contractual ceiling due to exam moderation and lab backlog.",
    JSON.stringify([
      { factor: "Lab Session Oversubscription", weight: "45%", direction: "Negative" },
      { factor: "Unassigned Substitute Coverage", weight: "35%", direction: "Negative" }
    ]),
    "gemini-hybrid-v2.4",
    JSON.stringify({ currentWorkload: 35.2, maxCap: 35.0, projectedOvertime: "+2.8h" })
  ],
  [
    "Support Intervention", "Early At-Risk Student Influx", "All Campuses",
    18.0, 12.0, 86.5, "High",
    "Forecast indicates 18 additional students will breach academic/attendance warning thresholds within 30 days without remedial action.",
    JSON.stringify([
      { factor: "Mid-Term Score Variance", weight: "52%", direction: "Negative" },
      { factor: "Consecutive Absences > 3", weight: "38%", direction: "Negative" }
    ]),
    "gemini-hybrid-v2.4",
    JSON.stringify({ currentAtRisk: 12, projectedAtRisk: 18, capacityGap: "6 sessions/wk" })
  ]
];

for (const p of predictions) {
  insertPred.run(...p);
}

// ----------------------------------------------------
// 11. ANOMALIES (Multi-Domain)
// ----------------------------------------------------
const insertAnom = db.prepare(`
  INSERT INTO anomalies (domain, metric, actual_value, expected_value, difference, severity, confidence, explanation, contributing_factors, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
`);

const anomalies = [
  [
    "Attendance", "Daily Attendance Rate", 84.8, 91.5, -6.7, "High", 93.0,
    "Current district attendance of 84.8% is 6.7% below the seasonal expected average of 91.5%.",
    JSON.stringify(["Grade 10 cohort absenteeism spike (+14%)", "Unexcused medical notes up 28%"])
  ],
  [
    "Teaching", "Faculty Workload Hours", 38.0, 32.0, 6.0, "Critical", 95.0,
    "Computer Science faculty (Kiran Singh) logging 38 hours/week, 6 hours above baseline expectations.",
    JSON.stringify(["Lab equipment configuration duties", "Coverage for open adjunct position"])
  ],
  [
    "Parent Communication", "Average Inquiry SLA Resolution Time", 38.5, 24.0, 14.5, "High", 89.0,
    "Parent ticket turnaround time has jumped to 38.5 hours against the 24.0-hour SLA guarantee.",
    JSON.stringify(["Transportation route grievance influx (+22 tickets)", "Front office understaffing on Wednesday"])
  ],
  [
    "Assessment", "Grade 11 Commerce Quiz Failure Rate", 34.0, 12.0, 22.0, "Medium", 87.0,
    "34% failure rate in Accountancy Quiz 2 is an abnormal deviation from historical 12% norm.",
    JSON.stringify(["Topic complexity difficulty spike", "Low pre-quiz homework completion rate (58%)"])
  ]
];

for (const a of anomalies) {
  insertAnom.run(...a);
}

// ----------------------------------------------------
// 12. PREVENTIVE ACTIONS & RECOMMENDATIONS
// ----------------------------------------------------
const insertPrev = db.prepare(`
  INSERT INTO preventive_actions (title, domain, description, expected_impact, assumptions, constraints, status, recommended_by, outcome_evaluation)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'Gemini AI Predictive Engine', ?)
`);

const preventiveActions = [
  [
    "Deploy Floating Mathematics Substitute & Split Grade 10-A Lab Session",
    "Teaching",
    "Assign 4 weekly lab periods from Dr. Nair to roving substitute teacher to prevent faculty burnout before mid-term exams.",
    "+8.5% teaching delivery quality, -4.2 hours faculty overtime, burnout risk reduced by 65%",
    "Substitute teacher certified in high school calculus is available within district pool",
    "Budget allocation for 16 substitute hours must be approved by Operations Admin",
    "Approved",
    "Dr. Nair weekly hours stabilized at 32.3h (within safe operating threshold)."
  ],
  [
    "Automated SMS Attendance Verification & Immediate Counsellor Check-in",
    "Attendance",
    "Trigger instantaneous WhatsApp/SMS alert to guardians when a student misses 2 consecutive days, and route to counsellor queue.",
    "Projected 5.4% recovery in attendance within 14 school days, truant recidivism cut by 40%",
    "Guardian mobile numbers updated in SIS registry (currently 94% verified)",
    "Compliance with student privacy and local telecom notification hours (08:00 - 18:00)",
    "Pending Review",
    null
  ],
  [
    "Temporary Redistribution of Transportation Route 4 to Relieve Parent Inquiries",
    "Parent Communication",
    "Re-route bus fleet 4 into two smaller mini-bus loops to eliminate chronic 45-minute pickup delays.",
    "Eliminates 80% of parent transport grievances, restores SLA resolution to <18 hours",
    "Additional mini-bus and driver available from Central Depot",
    "Requires transportation vendor route modification authorization",
    "Pending Review",
    null
  ]
];

for (const pa of preventiveActions) {
  const res = insertPrev.run(...pa);
  // Add a sample feedback rating for the approved action
  if (pa[6] === "Approved") {
    db.prepare(`
      INSERT INTO user_feedback (action_id, user_id, user_name, rating, feedback_text)
      VALUES (?, ?, 'Marcus Vance', 5, 'Substitute was deployed on Tuesday. Workload returned to safe limits immediately.')
    `).run(res.lastInsertRowid, userIds[1]);
  }
}

// ----------------------------------------------------
// 13. CONFIGURABLE ALERT THRESHOLDS & SLA RULES
// ----------------------------------------------------
const insertThreshold = db.prepare(`
  INSERT INTO thresholds (key, name, domain, warning_value, critical_value, unit, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, 'System Admin')
`);

const defaultThresholds = [
  ["att_drop_daily", "Attendance Drop Alert", "Attendance", 5.0, 8.0, "% Drop"],
  ["tch_workload_hours", "Teacher Overtime Threshold", "Teaching", 34.0, 38.0, "Hours/Week"],
  ["parent_sla_hours", "Parent Communication SLA", "Parent Communication", 24.0, 48.0, "Hours"],
  ["assess_fail_rate", "Assessment Failure Warning", "Assessment", 20.0, 30.0, "% Failed"],
  ["room_utilization", "Classroom Capacity Overload", "Timetable Planning", 85.0, 95.0, "% Capacity"],
  ["intervention_delay", "IEP Remediation Scheduling SLA", "Support Intervention", 3.0, 5.0, "Days"]
];

for (const th of defaultThresholds) {
  insertThreshold.run(...th);
}

// ----------------------------------------------------
// 14. INITIAL NOTIFICATIONS
// ----------------------------------------------------
const insertNotif = db.prepare(`
  INSERT INTO notifications (user_id, role, title, message, type, severity, is_read, link_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const initialNotifs = [
  [null, "Operations Admin", "SLA Critical Alert: Timetable Room Collision", "Lab 1 double booked Period 4 on Horizon North campus.", "sla_breach", "Critical", 0, "/workflows"],
  [null, "Operations Admin", "New AI Recommendation Awaiting Approval", "Preventive action generated to address attendance decline via automated SMS.", "approval", "Normal", 0, "/preventive-actions"],
  [userIds[1], "Operations Manager", "Task Assigned: Deploy Floating Substitute", "You have been assigned to coordinate substitute teacher coverage.", "task", "Normal", 0, "/tasks"],
  [null, "Operations Analyst", "Anomaly Detected: Parent SLA Delay", "Inquiry resolution time exceeded 24h threshold (+14.5h delay).", "anomaly", "High", 0, "/anomalies"],
  [null, "All", "System Status: Daily Forecast Refreshed", "Operational predictions updated using multi-stream telemetry.", "system", "Normal", 1, "/predictions"]
];

for (const n of initialNotifs) {
  insertNotif.run(...n);
}

// ----------------------------------------------------
// 15. INITIAL AUDIT LOGS
// ----------------------------------------------------
const insertAudit = db.prepare(`
  INSERT INTO audit_logs (user_id, user_name, role, action, entity, entity_id, details, ip_address, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, '127.0.0.1', 'Success')
`);

const initialAudits = [
  [userIds[0], "Elena Rostova", "Operations Admin", "LOGIN", "Auth", "1", "User logged in successfully via JWT session"],
  [userIds[0], "Elena Rostova", "Operations Admin", "PREDICTION_APPROVE", "Prediction", "1", "Approved preventive action #1: Deploy floating mathematics substitute"],
  [userIds[1], "Marcus Vance", "Operations Manager", "TASK_UPDATE", "Task", "1", "Updated task status from Open to In Progress"],
  [userIds[2], "Sarah Chen", "Operations Analyst", "REPORT_EXPORT", "Report", "REP-01", "Exported Weekly Operational Digest as CSV"],
  [userIds[0], "Elena Rostova", "Operations Admin", "THRESHOLD_UPDATE", "Settings", "att_drop_daily", "Adjusted attendance warning threshold from 6.0% to 5.0%"]
];

for (const a of initialAudits) {
  insertAudit.run(...a);
}

console.log("Database seeded successfully with rich K-12 operations domain data!");
