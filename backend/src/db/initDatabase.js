const db = require("./database");

console.log("Setting up database tables...");

db.exec(`
  -- Drop existing legacy tables to ensure clean schema upgrade
  DROP TABLE IF EXISTS task_history;
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS workflow_history;
  DROP TABLE IF EXISTS workflow_queues;
  DROP TABLE IF EXISTS assessments;
  DROP TABLE IF EXISTS attendance;
  DROP TABLE IF EXISTS attendance_history;
  DROP TABLE IF EXISTS guardians;
  DROP TABLE IF EXISTS classes;
  DROP TABLE IF EXISTS teachers;
  DROP TABLE IF EXISTS students;
  DROP TABLE IF EXISTS user_feedback;
  DROP TABLE IF EXISTS preventive_actions;
  DROP TABLE IF EXISTS anomalies;
  DROP TABLE IF EXISTS predictions;
  DROP TABLE IF EXISTS scenarios;
  DROP TABLE IF EXISTS thresholds;
  DROP TABLE IF EXISTS notifications;
  DROP TABLE IF EXISTS notification_preferences;
  DROP TABLE IF EXISTS audit_logs;
  DROP TABLE IF EXISTS reports_history;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS campuses;

  -- Campuses / Tenancy
  CREATE TABLE campuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    student_capacity INTEGER DEFAULT 1000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users & RBAC
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Operations Analyst',
    campus_id INTEGER,
    department TEXT DEFAULT 'Operations',
    status TEXT NOT NULL DEFAULT 'active',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Students
  CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    campus_id INTEGER NOT NULL,
    grade INTEGER NOT NULL,
    class_name TEXT NOT NULL,
    attendance_rate REAL DEFAULT 0,
    learning_score REAL DEFAULT 0,
    guardian_name TEXT,
    guardian_email TEXT,
    guardian_phone TEXT,
    risk_tier TEXT DEFAULT 'Low',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Teachers & Faculty
  CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    campus_id INTEGER NOT NULL,
    department TEXT NOT NULL,
    subject TEXT NOT NULL,
    workload_hours REAL DEFAULT 0,
    max_capacity_hours REAL DEFAULT 35,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Guardians / Parents
  CREATE TABLE guardians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    student_id INTEGER NOT NULL,
    relationship TEXT DEFAULT 'Parent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  -- Classes & Schedule
  CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    campus_id INTEGER NOT NULL,
    grade INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    teacher_id INTEGER,
    capacity INTEGER DEFAULT 30,
    enrolled_count INTEGER DEFAULT 0,
    FOREIGN KEY (campus_id) REFERENCES campuses(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
  );

  -- Attendance Records
  CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    campus_id INTEGER NOT NULL,
    attendance_date TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Historical Multi-Day Attendance Aggregates
  CREATE TABLE attendance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campus_id INTEGER,
    attendance_date TEXT NOT NULL,
    attendance_rate REAL NOT NULL,
    chronic_absence_count INTEGER DEFAULT 0,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Assessments
  CREATE TABLE assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL DEFAULT 100,
    assessment_date TEXT NOT NULL,
    term TEXT DEFAULT 'Term 1',
    status TEXT DEFAULT 'Completed',
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  -- Live Workflow Queues (Covers all 8 domains)
  CREATE TABLE workflow_queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Pending',
    owner_id INTEGER,
    owner_name TEXT,
    campus_id INTEGER,
    due_time TEXT,
    sla_risk TEXT NOT NULL DEFAULT 'On Track',
    linked_entity_type TEXT,
    linked_entity_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Workflow Activity History
  CREATE TABLE workflow_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflow_queues(id)
  );

  -- Tasks & Escalations
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Open',
    assigned_to TEXT,
    assigned_user_id INTEGER,
    due_date TEXT,
    campus_id INTEGER,
    linked_prediction_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campus_id) REFERENCES campuses(id)
  );

  -- Task Action Timeline / Audit
  CREATE TABLE task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );

  -- AI Predictions
  CREATE TABLE predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    prediction_type TEXT NOT NULL,
    target_entity TEXT,
    predicted_value REAL,
    actual_value REAL,
    confidence REAL,
    risk_level TEXT,
    explanation TEXT,
    contributing_factors TEXT,
    model_version TEXT,
    snapshot_data TEXT,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Operational Anomalies
  CREATE TABLE anomalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    metric TEXT NOT NULL,
    actual_value REAL,
    expected_value REAL,
    difference REAL,
    severity TEXT,
    confidence REAL DEFAULT 90,
    explanation TEXT,
    contributing_factors TEXT,
    status TEXT DEFAULT 'Active',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Preventive Actions & Closed-loop Outcome Tracking
  CREATE TABLE preventive_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    assumptions TEXT,
    constraints TEXT,
    status TEXT DEFAULT 'Pending Review',
    recommended_by TEXT DEFAULT 'Gemini AI Predictive Engine',
    approved_by TEXT,
    approved_at DATETIME,
    rejection_reason TEXT,
    outcome_evaluation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- User Feedback on AI Recommendations
  CREATE TABLE user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id INTEGER NOT NULL,
    user_id INTEGER,
    user_name TEXT,
    rating INTEGER NOT NULL,
    feedback_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (action_id) REFERENCES preventive_actions(id)
  );

  -- What-If Scenarios
  CREATE TABLE scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    parameters TEXT NOT NULL,
    baseline_impact TEXT,
    projected_impact TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Configurable Alert Thresholds & SLA Rules
  CREATE TABLE thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    warning_value REAL NOT NULL,
    critical_value REAL NOT NULL,
    unit TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- In-App Notifications Feed
  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT DEFAULT 'Normal',
    is_read INTEGER DEFAULT 0,
    link_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Notification Preferences
  CREATE TABLE notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    email_alerts INTEGER DEFAULT 1,
    in_app_alerts INTEGER DEFAULT 1,
    sla_critical INTEGER DEFAULT 1,
    anomalies INTEGER DEFAULT 1,
    task_updates INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Tamper-Evident Searchable Audit Logs
  CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'Success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Generated Reports History
  CREATE TABLE reports_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    filters_applied TEXT,
    file_format TEXT DEFAULT 'CSV',
    generated_by TEXT NOT NULL,
    status TEXT DEFAULT 'Completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("K-12 Command Center database tables initialized cleanly.");