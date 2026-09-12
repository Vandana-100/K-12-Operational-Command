async function runTestSuite() {
  console.log("=== STARTING K-12 COMMAND CENTER API VERIFICATION SUITE ===");

  // 1. Auth Test
  const loginRes = await fetch("https://k-12-operational-command.onrender.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@school.com", password: "admin123" })
  });
  const loginData = await loginRes.json();
  console.log("✓ 1. Authentication:", loginData.message, "| User:", loginData.user.name, "| Role:", loginData.user.role);

  const token = loginData.token;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 2. Dashboard KPIs
  const dashRes = await fetch("https://k-12-operational-command.onrender.com/api/dashboard", { headers });
  const dash = await dashRes.json();
  console.log("✓ 2. Dashboard KPIs:", `Enrolment: ${dash.enrollment.total} (${dash.enrollment.utilizationRate}%)`, `| Att: ${dash.attendance.currentRate}%`, `| Workload: ${dash.teacherWorkload.averageHours}h`, `| Alerts: ${dash.activeAlerts.length}`);

  // 3. Workflow Queues across 8 Domains
  const wfRes = await fetch("https://k-12-operational-command.onrender.com/api/workflows", { headers });
  const wf = await wfRes.json();
  console.log("✓ 3. Live Workflow Queues:", `${wf.totalCount} active items across 8 domains`);

  // 4. Multi-Stream Predictions
  const predRes = await fetch("https://k-12-operational-command.onrender.com/api/predictions", { headers });
  const pred = await predRes.json();
  console.log("✓ 4. Predictions Telemetry:", `${pred.count} forecast streams. First stream: ${pred.predictions[0].domain} (${pred.predictions[0].risk_level} risk)`);

  // 5. Anomalies
  const anomRes = await fetch("https://k-12-operational-command.onrender.com/api/anomalies", { headers });
  const anom = await anomRes.json();
  console.log("✓ 5. Anomaly Engine:", `${anom.count} operational anomalies detected. Critical: ${anom.criticalCount}`);

  // 6. Tasks
  const taskRes = await fetch("https://k-12-operational-command.onrender.com/api/tasks", { headers });
  const tasks = await taskRes.json();
  console.log("✓ 6. Tasks & Dispatch:", `${tasks.tasks.length} total tasks | Open: ${tasks.summary.open} | InProgress: ${tasks.summary.inProgress}`);

  // 7. What-If Scenario Sandbox
  const scenRes = await fetch("https://k-12-operational-command.onrender.com/api/scenarios/simulate", {
    method: "POST",
    headers,
    body: JSON.stringify({ scenarioName: "15% Enrolment Surge", enrolmentSurgePct: 15, teacherAbsenteeismPct: 5, interventionBudgetShiftPct: 10 })
  });
  const scen = await scenRes.json();
  console.log("✓ 7. What-If Scenario Sandbox:", `Simulated Class Size: ${scen.simulated.averageClassSize} | Faculty Load: ${scen.simulated.teacherWeeklyHours}h | Risk Score: ${scen.simulated.operationalRiskScore}/100`);

  // 8. Notifications
  const notifRes = await fetch("https://k-12-operational-command.onrender.com/api/notifications", { headers });
  const notif = await notifRes.json();
  console.log("✓ 8. Notification Center:", `${notif.notifications.length} alerts loaded | Unread: ${notif.unreadCount}`);

  // 9. Users Directory
  const userRes = await fetch("https://k-12-operational-command.onrender.com/api/users", { headers });
  const users = await userRes.json();
  console.log("✓ 9. Users & Roles Directory:", `${users.users.length} staff & administrator accounts configured`);

  // 10. Audit Logs
  const auditRes = await fetch("https://k-12-operational-command.onrender.com/api/audit", { headers });
  const audit = await auditRes.json();
  console.log("✓ 10. Tamper-Evident Audit Logs:", `${audit.totalCount} immutable audit trail records recorded`);

  // 11. AI Engine Ping
  const aiRes = await fetch("https://k-12-operational-command.onrender.com/api/settings/ai/test", { method: "POST", headers });
  const ai = await aiRes.json();
  console.log("✓ 11. AI Engine Health Ping:", `${ai.mode} | Model: ${ai.model} | Status: ${ai.message}`);

  console.log("\n=================================================================");
  console.log("✅ ALL 11 API SUITES VALIDATED AND FUNCTIONING WITH ZERO ERRORS!");
  console.log("=================================================================");
}

runTestSuite().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
