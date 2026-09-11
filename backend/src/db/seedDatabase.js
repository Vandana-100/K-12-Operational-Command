const db = require("./database");

// -------------------------
// Insert Teachers
// -------------------------

const insertTeacher = db.prepare(`
  INSERT INTO teachers
  (name, subject, workload_hours)
  VALUES (?, ?, ?)
`);

const teachers = [
  ["Ravi Kumar", "Mathematics", 32],
  ["Priya Sharma", "Science", 28],
  ["Anil Reddy", "English", 30],
  ["Sneha Rao", "Social Studies", 26],
  ["Kiran Singh", "Computer Science", 35]
];

for (const teacher of teachers) {
  insertTeacher.run(...teacher);
}


// -------------------------
// Insert Assessments
// -------------------------

const insertAssessment = db.prepare(`
  INSERT INTO assessments
  (student_id, subject, score, assessment_date)
  VALUES (?, ?, ?, ?)
`);

const assessments = [
  [1, "Mathematics", 88, "2026-09-01"],
  [2, "Mathematics", 76, "2026-09-01"],
  [3, "Mathematics", 64, "2026-09-01"],
  [4, "Mathematics", 92, "2026-09-01"],
  [5, "Mathematics", 71, "2026-09-01"],

  [1, "Science", 85, "2026-09-03"],
  [2, "Science", 74, "2026-09-03"],
  [3, "Science", 62, "2026-09-03"],
  [4, "Science", 90, "2026-09-03"],
  [5, "Science", 70, "2026-09-03"]
];

for (const assessment of assessments) {
  insertAssessment.run(...assessment);
}

console.log("Teachers and assessments inserted successfully");
const insertAttendanceHistory = db.prepare(`
  INSERT INTO attendance_history
  (attendance_date, attendance_rate)
  VALUES (?, ?)
`);

const attendanceHistory = [
  ["2026-08-25", 94],
  ["2026-08-26", 93],
  ["2026-08-27", 92],
  ["2026-08-28", 91],
  ["2026-08-29", 90],
  ["2026-08-30", 89],
  ["2026-08-31", 88],
  ["2026-09-01", 87],
  ["2026-09-02", 86],
  ["2026-09-03", 85],
  ["2026-09-04", 84]
];

for (const record of attendanceHistory) {
  insertAttendanceHistory.run(...record);
}

console.log("Historical attendance data inserted successfully");