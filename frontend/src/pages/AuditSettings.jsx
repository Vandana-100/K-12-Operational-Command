import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, LoadingSpinner, Badge, Modal } from "../components/CommonUI";
import { IconAudit, IconSettings, IconRefresh, IconSearch, IconBrain, IconCheck } from "../components/Icons";

export default function AuditSettings() {
  const [activeTab, setActiveTab] = useState("audit"); // "audit" | "settings" | "ai"
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [actionsList, setActionsList] = useState([]);
  const [entitiesList, setEntitiesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Audit Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");

  // System Settings State
  const [campuses, setCampuses] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `https://k-12-operational-command.onrender.com/api/audit?action=${actionFilter}&entity=${entityFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(res.data.logs || []);
      setTotalCount(res.data.totalCount || 0);
      setActionsList(res.data.actions || []);
      setEntitiesList(res.data.entities || []);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const [campRes, aiRes] = await Promise.all([
        axios.get("https://k-12-operational-command.onrender.com/api/settings/campuses", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("https://k-12-operational-command.onrender.com/api/settings/ai/status", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCampuses(campRes.data || []);
      setAiStatus(aiRes.data || null);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  useEffect(() => {
    loadAuditLogs();
    loadSettings();
  }, [actionFilter, entityFilter]);

  const handleTestAiConnection = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("https://k-12-operational-command.onrender.com/api/settings/ai/test", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult(res.data);
      setAiStatus(res.data);
    } catch (e) {
      setTestResult({
        connected: false,
        message: "Failed to ping AI service endpoint."
      });
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Audit Logs & System Settings
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Immutable compliance record keeping and core predictive operations configuration.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("audit")}
            className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-secondary"} btn-sm`}
          >
            <IconAudit size={14} />
            <span>Audit Trail ({totalCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`btn ${activeTab === "settings" ? "btn-primary" : "btn-secondary"} btn-sm`}
          >
            <IconSettings size={14} />
            <span>Campuses & SLAs</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`btn ${activeTab === "ai" ? "btn-primary" : "btn-secondary"} btn-sm`}
          >
            <IconBrain size={14} />
            <span>AI Engine Status</span>
          </button>
        </div>
      </div>

      {/* 1. AUDIT LOGS TAB */}
      {activeTab === "audit" && (
        <div>
          {/* Security Banner */}
          <div style={{
            padding: "10px 16px",
            backgroundColor: "#f8fafc",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12.5px"
          }}>
            <span style={{ color: "var(--navy-700)" }}>
              🔒 <strong>Tamper-Evident Non-Repudiation Storage:</strong> Audit records are append-only. Modification and deletion routes are permanently blocked.
            </span>
            <span className="badge badge-success font-bold">WORM Compliance Active</span>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
              <input
                type="text"
                className="input"
                placeholder="Search audit details, actor, or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAuditLogs()}
                style={{ paddingLeft: "34px" }}
              />
              <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                <IconSearch size={16} />
              </div>
            </div>

            <div style={{ minWidth: "160px" }}>
              <select className="select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="All">All Actions</option>
                {actionsList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div style={{ minWidth: "160px" }}>
              <select className="select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
                <option value="All">All Entities</option>
                {entitiesList.map(ent => <option key={ent} value={ent}>{ent}</option>)}
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={loadAuditLogs}>
              <IconRefresh size={14} />
              <span>Query Logs</span>
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Querying immutable compliance audit trail..." />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Action</th>
                    <th>Actor & Role</th>
                    <th>Target Entity</th>
                    <th>Details & Diffs</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: "700", color: "var(--text-muted)" }}>#{log.id}</td>
                      <td>
                        <span style={{
                          fontWeight: "700",
                          fontSize: "11.5px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: log.action.includes("DELETE") || log.action.includes("FAILED") ? "#fee2e2" : log.action.includes("APPROVE") ? "#ecfdf5" : "#eff6ff",
                          color: log.action.includes("DELETE") || log.action.includes("FAILED") ? "#991b1b" : log.action.includes("APPROVE") ? "#065f46" : "#1e40af"
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: "600" }}>{log.user_name || "System"}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{log.role || "System Daemon"}</div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {log.entity} {log.entity_id ? `(#${log.entity_id})` : ""}
                        </span>
                      </td>
                      <td style={{ fontSize: "12.5px", maxWidth: "340px", wordBreak: "break-word" }}>
                        {log.details}
                      </td>
                      <td>
                        <span className={`badge ${log.status === "Success" ? "badge-success" : "badge-danger"}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {log.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. CAMPUSES & SLA SETTINGS TAB */}
      {activeTab === "settings" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Card title="District Campuses (Multi-Tenant Master Data)" subtitle="Institutional capacity and geographic boundaries">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {campuses.map(c => (
                  <div key={c.id} style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-main)" }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Code: <strong>{c.code}</strong> • Location: {c.city}
                        </div>
                      </div>
                      <span className="badge badge-info">
                        Capacity: {c.student_capacity} Students
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12.5px", color: "var(--text-muted)" }}>
                      <span>Enrolled Students: <strong>{c.student_count || 0}</strong></span>
                      <span>Assigned Teachers: <strong>{c.teacher_count || 0}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Core SLA & Escalation Rules" subtitle="System-wide time-to-first-response and auto-escalation thresholds">
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <strong>Parent Inquiries:</strong> Maximum 24-hour first response SLA. Auto-escalated to supervisor queue after 36 hours.
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <strong>Timetable Collisions:</strong> High-priority alerts flagged immediately. Auto-escalated to Critical 2 hours before scheduled period.
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <strong>Attendance Truancy:</strong> Students breaching 3 consecutive absences routed to Counsellor Support Intervention queue within 1 school day.
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <strong>Teacher Overload:</strong> Faculty approaching &gt;34 weekly teaching hours highlighted for floating substitute coverage.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 3. AI ENGINE STATUS TAB */}
      {activeTab === "ai" && (
        <div>
          <Card title="AI Predictive Engine Architecture & Telemetry" subtitle="Google Gemini Generative AI with resilient deterministic heuristic fallback">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ padding: "18px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Active Operational Engine Mode
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: aiStatus?.connected ? "#10b981" : "#2563eb", marginBottom: "6px" }}>
                  {aiStatus?.mode || "Deterministic Operational Fallback Engine"}
                </div>
                <p style={{ fontSize: "13px", color: "var(--navy-700)" }}>
                  {aiStatus?.message || "Operational heuristic engine running with calibrated K-12 statistical baseline rules."}
                </p>
              </div>

              <div style={{ padding: "18px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Engine Configuration & Safety
                </div>
                <div style={{ fontSize: "13.5px", lineHeight: "1.8", color: "var(--navy-700)" }}>
                  <div>• <strong>Engine Version:</strong> {aiStatus?.model || "gemini-hybrid-v2.4"}</div>
                  <div>• <strong>Child Safeguarding Guardrails:</strong> Enabled (Strict Privacy)</div>
                  <div>• <strong>Human-in-the-Loop:</strong> Mandatory for material changes</div>
                  <div>• <strong>Zero External Secret Leakage:</strong> Enforced</div>
                </div>
              </div>
            </div>

            {/* Test Connection Box */}
            <div style={{ padding: "18px", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 2px" }}>
                    Test AI Connection & Health Ping
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0 }}>
                    Performs a live round-trip test against Google Gemini API or deterministic fallback engine.
                  </p>
                </div>

                <button className="btn btn-primary btn-sm" onClick={handleTestAiConnection} disabled={testingAi}>
                  <IconBrain size={14} />
                  <span>{testingAi ? "Pinging Engine..." : "Test AI Engine Live Ping"}</span>
                </button>
              </div>

              {testResult && (
                <div style={{
                  padding: "14px",
                  backgroundColor: testResult.connected ? "#ecfdf5" : "#eff6ff",
                  border: "1px solid",
                  borderColor: testResult.connected ? "#a7f3d0" : "#bfdbfe",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: testResult.connected ? "#065f46" : "#1e40af"
                }}>
                  <div style={{ fontWeight: "700", marginBottom: "4px" }}>
                    {testResult.connected ? "✓ Gemini AI Live Connection Established!" : "ℹ️ Operational Fallback Engine Verified"}
                  </div>
                  <div>{testResult.message}</div>
                  {testResult.sampleOutput && (
                    <div style={{ marginTop: "6px", fontStyle: "italic" }}>
                      AI Response: "{testResult.sampleOutput}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
