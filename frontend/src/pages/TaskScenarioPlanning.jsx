import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, DomainBadge, PriorityBadge, LoadingSpinner, EmptyState, Modal } from "../components/CommonUI";
import { IconTasks, IconPlus, IconRefresh, IconCheck, IconX, IconAlertTriangle } from "../components/Icons";

export default function TaskScenarioPlanning() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isFieldStaff = user.role === "Field Staff";

  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "table" | "scenario" | "timeline"

  // Task creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState("Teaching");
  const [newPriority, setNewPriority] = useState("High");
  const [newAssignee, setNewAssignee] = useState("Marcus Vance");
  const [newDueDate, setNewDueDate] = useState("2026-09-15");
  const [newNotes, setNewNotes] = useState("");

  // What-If Scenario Sandbox State
  const [scenarioName, setScenarioName] = useState("15% Mid-Year Enrolment Surge");
  const [enrolmentSurge, setEnrolmentSurge] = useState(15);
  const [teacherAbsence, setTeacherAbsence] = useState(5);
  const [interventionBudget, setInterventionBudget] = useState(10);
  const [simulatedResult, setSimulatedResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const loadTasksAndTimeline = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [taskRes, timeRes] = await Promise.all([
        axios.get("http://localhost:4000/api/tasks", { headers }),
        axios.get("http://localhost:4000/api/tasks/timeline", { headers })
      ]);

      setTasks(taskRes.data.tasks || []);
      setTimeline(timeRes.data || []);
    } catch (e) {
      console.error("Error loading tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:4000/api/scenarios/simulate", {
        scenarioName,
        enrolmentSurgePct: Number(enrolmentSurge),
        teacherAbsenteeismPct: Number(teacherAbsence),
        interventionBudgetShiftPct: Number(interventionBudget)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSimulatedResult(res.data);
    } catch (e) {
      alert("Failed to run scenario simulation");
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    loadTasksAndTimeline();
    runSimulation();
  }, []);

  const handleUpdateStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:4000/api/tasks/${taskId}`, {
        status,
        reason: `Status changed to ${status}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTasksAndTimeline();
    } catch (e) {
      alert("Failed to update task status");
    }
  };

  const handleEscalate = async (taskId) => {
    const reason = prompt("Mandatory Justification for Task Escalation:", "Approaching SLA breach threshold. Requires immediate supervisor intervention.");
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:4000/api/tasks/${taskId}/escalate`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTasksAndTimeline();
    } catch (e) {
      alert("Failed to escalate task");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:4000/api/tasks", {
        title: newTitle,
        domain: newDomain,
        priority: newPriority,
        assigned_to: newAssignee,
        due_date: newDueDate,
        notes: newNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewNotes("");
      loadTasksAndTimeline();
    } catch (e) {
      alert("Failed to create task");
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Task Assignment, Escalation & Scenario Planning
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Operational dispatch board, supervisor escalation workflows, and What-If scenario sandbox.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={loadTasksAndTimeline}>
            <IconRefresh size={14} />
            <span>Refresh</span>
          </button>
          {!isFieldStaff && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              <IconPlus size={14} />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "20px" }}>
        <button
          onClick={() => setViewMode("kanban")}
          className={`btn ${viewMode === "kanban" ? "btn-primary" : "btn-secondary"} btn-sm`}
        >
          Kanban Board
        </button>
        <button
          onClick={() => setViewMode("table")}
          className={`btn ${viewMode === "table" ? "btn-primary" : "btn-secondary"} btn-sm`}
        >
          Task Table
        </button>
        <button
          onClick={() => setViewMode("scenario")}
          className={`btn ${viewMode === "scenario" ? "btn-primary" : "btn-secondary"} btn-sm`}
        >
          🔮 What-If Scenario Sandbox
        </button>
        <button
          onClick={() => setViewMode("timeline")}
          className={`btn ${viewMode === "timeline" ? "btn-primary" : "btn-secondary"} btn-sm`}
        >
          Action Audit Timeline
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading operational task assignments..." />
      ) : (
        <>
          {/* 1. KANBAN BOARD VIEW */}
          {viewMode === "kanban" && (
            <div className="kpi-grids">
              {["Open", "In Progress", "Completed"].map(status => {
                const columnTasks = tasks.filter(t => t.status === status);
                return (
                  <div key={status} style={{ backgroundColor: "#f8fafc", borderRadius: "10px", padding: "16px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px" }}>{status}</span>
                      <span className="badge badge-neutral font-bold">{columnTasks.length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {columnTasks.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                          No tasks in {status}
                        </div>
                      ) : (
                        columnTasks.map(t => (
                          <div key={t.id} style={{
                            backgroundColor: "#ffffff",
                            padding: "14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            boxShadow: "var(--shadow-sm)"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <DomainBadge domain={t.domain} />
                              <PriorityBadge priority={t.priority} />
                            </div>

                            <div style={{ fontWeight: "600", fontSize: "13.5px", color: "var(--text-main)", marginBottom: "6px" }}>
                              {t.title}
                            </div>

                            {t.notes && (
                              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
                                {t.notes}
                              </p>
                            )}

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", color: "var(--text-muted)", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                              <span>👤 {t.assigned_to || "Unassigned"}</span>
                              <span>📅 {t.due_date || "No due date"}</span>
                            </div>

                            <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                              {status !== "In Progress" && (
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleUpdateStatus(t.id, "In Progress")}>
                                  Start
                                </button>
                              )}
                              {status !== "Completed" && (
                                <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleUpdateStatus(t.id, "Completed")}>
                                  Done
                                </button>
                              )}
                              {!isFieldStaff && t.priority !== "Critical" && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleEscalate(t.id)}>
                                  Escalate
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. TABLE VIEW */}
          {viewMode === "table" && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Domain</th>
                    <th>Task Title</th>
                    <th>Priority</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td><DomainBadge domain={t.domain} /></td>
                      <td style={{ fontWeight: "600" }}>{t.title}</td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td>{t.assigned_to || "Unassigned"}</td>
                      <td>{t.due_date || "No due date"}</td>
                      <td>
                        <select
                          className="select"
                          style={{ padding: "4px 8px", fontSize: "12px", width: "auto" }}
                          value={t.status}
                          onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!isFieldStaff && t.priority !== "Critical" && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleEscalate(t.id)}>
                            Escalate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. WHAT-IF SCENARIO PLANNING SANDBOX */}
          {viewMode === "scenario" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
                {/* Sliders & Parameters */}
                <Card title="Scenario Parameter Sandbox" subtitle="Adjust operational stress variables to simulate failure points">
                  <div className="form-group">
                    <label className="form-label">Scenario Preset</label>
                    <select
                      className="select"
                      value={scenarioName}
                      onChange={(e) => {
                        setScenarioName(e.target.value);
                        if (e.target.value === "15% Mid-Year Enrolment Surge") {
                          setEnrolmentSurge(15); setTeacherAbsence(5); setInterventionBudget(10);
                        } else if (e.target.value === "Seasonal Flu Outbreak (20% Absenteeism)") {
                          setEnrolmentSurge(0); setTeacherAbsence(20); setInterventionBudget(5);
                        } else if (e.target.value === "Remedial Budget Surge (+30%)") {
                          setEnrolmentSurge(5); setTeacherAbsence(5); setInterventionBudget(30);
                        }
                      }}
                    >
                      <option value="15% Mid-Year Enrolment Surge">15% Mid-Year Enrolment Surge</option>
                      <option value="Seasonal Flu Outbreak (20% Absenteeism)">Seasonal Flu Outbreak (20% Absenteeism)</option>
                      <option value="Remedial Budget Surge (+30%)">Remedial Budget Surge (+30%)</option>
                      <option value="Custom Simulation">Custom Parameters</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span className="font-semibold">Student Enrolment Surge:</span>
                      <span style={{ fontWeight: "700", color: "var(--primary)" }}>+{enrolmentSurge}%</span>
                    </div>
                    <input
                      type="range" min="0" max="30" step="1"
                      value={enrolmentSurge}
                      onChange={(e) => setEnrolmentSurge(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span className="font-semibold">Teacher Absenteeism Rate:</span>
                      <span style={{ fontWeight: "700", color: "#dc2626" }}>{teacherAbsence}%</span>
                    </div>
                    <input
                      type="range" min="0" max="30" step="1"
                      value={teacherAbsence}
                      onChange={(e) => setTeacherAbsence(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span className="font-semibold">Intervention Budget Adjustment:</span>
                      <span style={{ fontWeight: "700", color: "#10b981" }}>+{interventionBudget}%</span>
                    </div>
                    <input
                      type="range" min="0" max="40" step="1"
                      value={interventionBudget}
                      onChange={(e) => setInterventionBudget(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <button className="btn btn-primary" style={{ width: "100%" }} onClick={runSimulation} disabled={simulating}>
                    {simulating ? "Calculating Model Projections..." : "Recalculate Scenario Impact"}
                  </button>
                </Card>

                {/* Simulation Output Comparison */}
                {simulatedResult && (
                  <div>
                    <Card title={`Simulation Projections: ${simulatedResult.scenarioName}`} subtitle="Comparison of current operational baseline against simulated stresses">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
                        {/* Class Size */}
                        <div style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#ffffff" }}>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Average Class Size</div>
                          <div style={{ fontSize: "22px", fontWeight: "700", margin: "4px 0" }}>
                            {simulatedResult.simulated.averageClassSize} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/ class</span>
                          </div>
                          <div style={{ fontSize: "12px", color: simulatedResult.deltas.classSizeDelta > 0 ? "#dc2626" : "#10b981", fontWeight: "600" }}>
                            {simulatedResult.deltas.classSizeDelta > 0 ? `+${simulatedResult.deltas.classSizeDelta}` : simulatedResult.deltas.classSizeDelta} from baseline (28.5)
                          </div>
                        </div>

                        {/* Teacher Hours */}
                        <div style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#ffffff" }}>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Faculty Weekly Load</div>
                          <div style={{ fontSize: "22px", fontWeight: "700", margin: "4px 0" }}>
                            {simulatedResult.simulated.teacherWeeklyHours}h <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/ week</span>
                          </div>
                          <div style={{ fontSize: "12px", color: simulatedResult.simulated.teacherWeeklyHours > 35 ? "#dc2626" : "#10b981", fontWeight: "600" }}>
                            {simulatedResult.simulated.teacherWeeklyHours > 35 ? "Ceiling Exceeded (+Overtime)" : "Within Safe Limits"}
                          </div>
                        </div>

                        {/* Risk Score */}
                        <div style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#ffffff" }}>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Operational Failure Risk</div>
                          <div style={{ fontSize: "22px", fontWeight: "700", margin: "4px 0", color: simulatedResult.simulated.operationalRiskScore > 60 ? "#dc2626" : "#f59e0b" }}>
                            {simulatedResult.simulated.operationalRiskScore} / 100
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            SLA Breach Prob: {simulatedResult.simulated.slaBreachProbabilityPct}%
                          </div>
                        </div>
                      </div>

                      {/* AI Scenario Mitigation Recommendations */}
                      <div className="ai-card">
                        <span className="ai-card-badge">AI SCENARIO MITIGATION</span>
                        <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
                          Proactive Contingency Protocols
                        </h4>
                        <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "#334155", lineHeight: "1.7" }}>
                          {simulatedResult.recommendedMitigation?.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. ACTION TIMELINE VIEW */}
          {viewMode === "timeline" && (
            <Card title="Operational Action Audit Timeline" subtitle="Tamper-evident record of all task creations, status updates, reassignments, and escalations">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
                {timeline.map(item => (
                  <div key={item.id} style={{ display: "flex", gap: "14px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      backgroundColor: item.action.includes("Escalat") ? "#fee2e2" : "#eff6ff",
                      color: item.action.includes("Escalat") ? "#dc2626" : "#2563eb",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "700", fontSize: "13px", flexShrink: 0
                    }}>
                      ⚡
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-main)" }}>
                          {item.action}: {item.task_title}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.created_at}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--navy-700)", marginTop: "2px" }}>
                        Actor: <strong>{item.actor_name}</strong> • State: {item.old_value} → <strong>{item.new_value}</strong>
                      </div>
                      {item.reason && (
                        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", backgroundColor: "#f8fafc", padding: "6px 10px", borderRadius: "6px", marginTop: "6px", borderLeft: "3px solid var(--primary)" }}>
                          Justification: {item.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Operational Task"
      >
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              type="text" className="input" placeholder="e.g. Deploy floating substitute teacher"
              value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">Domain</label>
              <select className="select" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}>
                <option value="Admission">Admission</option>
                <option value="Timetable Planning">Timetable Planning</option>
                <option value="Teaching">Teaching</option>
                <option value="Assessment">Assessment</option>
                <option value="Attendance">Attendance</option>
                <option value="Parent Communication">Parent Communication</option>
                <option value="Support Intervention">Support Intervention</option>
                <option value="Reporting">Reporting</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <input
                type="text" className="input" value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)} required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date" className="input" value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Operational Notes & Context</label>
            <textarea
              className="textarea" rows={2} placeholder="Context for assigned field staff..."
              value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
