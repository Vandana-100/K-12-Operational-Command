import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Card, DomainBadge, SlaBadge, PriorityBadge, LoadingSpinner } from "../components/CommonUI";
import { IconAlertTriangle, IconRefresh, IconArrowRight, IconCheck } from "../components/Icons";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campusId, setCampusId] = useState(localStorage.getItem("selectedCampus") || "All");

  const loadData = async (targetCampus = campusId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const url = targetCampus && targetCampus !== "All"
        ? `https://k-12-operational-command.onrender.com/api/dashboard?campusId=${targetCampus}`
        : "https://k-12-operational-command.onrender.com/api/dashboard";

      const trendsUrl = targetCampus && targetCampus !== "All"
        ? `https://k-12-operational-command.onrender.com/api/dashboard/trends?campusId=${targetCampus}`
        : "https://k-12-operational-command.onrender.com/api/dashboard/trends";

      const [dashRes, trendsRes] = await Promise.all([
        axios.get(url, { headers }),
        axios.get(trendsUrl, { headers })
      ]);

      setData(dashRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCampusChange = (e) => {
      const newCampus = e.detail;
      setCampusId(newCampus);
      loadData(newCampus);
    };

    window.addEventListener("campusChanged", handleCampusChange);
    return () => window.removeEventListener("campusChanged", handleCampusChange);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Aggregating District Operational Telemetry..." />;
  }

  if (!data) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3>Unable to connect to backend server.</h3>
        <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>Please verify backend service is running on port 4000.</p>
        <button className="btn btn-primary mt-4" onClick={() => loadData()}>
          Retry Telemetry Ingestion
        </button>
      </div>
    );
  }

  const { enrollment, attendance, learningProgress, assessmentPerformance, teacherWorkload, interventionCompletion, parentResponse, activeAlerts, operationalSummary } = data;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
              K-12 Operational Command Center
            </h1>
            <span className="badge badge-info font-bold">LIVE TELEMETRY</span>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-time proactive bottleneck prevention across all 8 educational domains.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadData()}>
            <IconRefresh size={14} />
            <span>Refresh Telemetry</span>
          </button>
          <Link to="/workflows">
            <button className="btn btn-primary btn-sm">
              <span>View 16 Live Queues</span>
              <IconArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>

      {/* Operational Exception Pulse Banner */}
      {operationalSummary?.activeSlaAlerts > 0 && (
        <div style={{
          backgroundColor: "#fff1f2",
          border: "1px solid #fecdd3",
          borderRadius: "10px",
          padding: "12px 18px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#e11d48", color: "#ffffff", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>
              ACTION REQUIRED
            </span>
            <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#9f1239" }}>
              {operationalSummary.activeSlaAlerts} Operational Queues have breached or are at imminent SLA risk.
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/workflows?sla_risk=Breached" style={{ fontSize: "12.5px", fontWeight: "700", color: "#e11d48", textDecoration: "underline" }}>
              Triage Breached Queues →
            </Link>
          </div>
        </div>
      )}

      {/* 7 KPI CARDS GRID */}
      <div className="kpi-grid">
        {/* 1. Enrolment */}
        <div className="kpi-card accent-purple">
          <div className="kpi-label">
            <span>Enrolment & Capacity</span>
            <span className="badge badge-neutral">{enrollment.utilizationRate}% Cap</span>
          </div>
          <div className="kpi-value">{enrollment.total} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>/ {enrollment.capacity}</span></div>
          <div className="kpi-footer">
            <span style={{ color: "#10b981", fontWeight: "600" }}>{enrollment.trend}</span>
            <span>Yield: 84.5%</span>
          </div>
        </div>

        {/* 2. Attendance */}
        <div className="kpi-card accent-rose">
          <div className="kpi-label">
            <span>Daily Attendance</span>
            <span className="badge badge-danger">Target: {attendance.targetRate}%</span>
          </div>
          <div className="kpi-value">{attendance.currentRate}%</div>
          <div className="kpi-footer">
            <span style={{ color: "#ef4444", fontWeight: "600" }}>{attendance.trend}</span>
            <span style={{ color: "#b91c1c", fontWeight: "600" }}>{attendance.chronicAbsenceCount} Chronic Truant</span>
          </div>
        </div>

        {/* 3. Learning Progress */}
        <div className="kpi-card accent-emerald">
          <div className="kpi-label">
            <span>Learning Progress</span>
            <span className="badge badge-success">On Pace</span>
          </div>
          <div className="kpi-value">{learningProgress.averageScore}%</div>
          <div className="kpi-footer">
            <span style={{ color: "#10b981", fontWeight: "600" }}>{learningProgress.trend}</span>
            <span>Target: {learningProgress.targetScore}%</span>
          </div>
        </div>

        {/* 4. Assessment Performance */}
        <div className="kpi-card accent-amber">
          <div className="kpi-label">
            <span>Assessment Performance</span>
            <span className="badge badge-warning">Pre-Midterm</span>
          </div>
          <div className="kpi-value">{assessmentPerformance.averageScore}%</div>
          <div className="kpi-footer">
            <span style={{ color: "#f59e0b", fontWeight: "600" }}>Pass Rate: {assessmentPerformance.passRate}%</span>
            <span>{assessmentPerformance.trend}</span>
          </div>
        </div>

        {/* 5. Teacher Workload */}
        <div className="kpi-card accent-rose">
          <div className="kpi-label">
            <span>Teacher Workload</span>
            <span className="badge badge-danger">{teacherWorkload.overloadedTeachers} Overloaded</span>
          </div>
          <div className="kpi-value">{teacherWorkload.averageHours} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>hrs/wk</span></div>
          <div className="kpi-footer">
            <span style={{ color: "#dc2626", fontWeight: "600" }}>Contract Cap: {teacherWorkload.maxCapacityHours}h</span>
            <span>STEM Overtime Peak</span>
          </div>
        </div>

        {/* 6. Support Intervention */}
        <div className="kpi-card accent-purple">
          <div className="kpi-label">
            <span>Intervention Completion</span>
            <span className="badge badge-info">{interventionCompletion.activeCases} Active IEPs</span>
          </div>
          <div className="kpi-value">{interventionCompletion.completionRate}%</div>
          <div className="kpi-footer">
            <span style={{ color: "#10b981", fontWeight: "600" }}>{interventionCompletion.trend}</span>
            <span>Goal: {interventionCompletion.targetRate}%</span>
          </div>
        </div>

        {/* 7. Parent Response Rate */}
        <div className="kpi-card accent-cyan">
          <div className="kpi-label">
            <span>Parent SLA Resolution</span>
            <span className="badge badge-warning">{parentResponse.openTickets} Open</span>
          </div>
          <div className="kpi-value">{parentResponse.avgResponseHours} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>hrs</span></div>
          <div className="kpi-footer">
            <span style={{ color: parentResponse.avgResponseHours > parentResponse.slaTargetHours ? "#ef4444" : "#10b981", fontWeight: "600" }}>
              Target: &lt;{parentResponse.slaTargetHours}h
            </span>
            <span>Compliance: {parentResponse.slaComplianceRate}%</span>
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Multi-Stream Trends Chart */}
        <Card title="14-Day Multi-Stream Operational Trends" subtitle="Telemetry tracking attendance, learning progress, assessment scores, and faculty workload">
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis domain={[20, 100]} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                <Legend />
                <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="learningProgress" name="Learning Progress %" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="assessmentScore" name="Assessment %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="teacherWorkload" name="Teacher Workload (h)" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* SLA Exception Ticker */}
        <Card title="Active Operational Bottlenecks" subtitle="Imminent SLA breaches requiring supervisor dispatch">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activeAlerts.map(alert => (
              <div key={alert.id} style={{
                padding: "10px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                backgroundColor: alert.sla_risk === "Breached" ? "#fef2f2" : "#fffbeb"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <DomainBadge domain={alert.domain} />
                  <SlaBadge risk={alert.sla_risk} />
                </div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)" }}>
                  {alert.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", fontSize: "11.5px", color: "var(--text-muted)" }}>
                  <span>Due: {alert.due_time}</span>
                  <Link to={`/workflows`} style={{ color: "var(--primary)", fontWeight: "600" }}>
                    Resolve →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* QUICK WORKFLOW & PREDICTION SHORTCUT BAR */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <Card title="AI Predictive Recommendations" subtitle="Generated by Gemini Hybrid Operational Engine">
          <div className="ai-explanation-box">
            <strong>Active Recommendation:</strong> Floating substitute allocation is recommended for Grade 10 Mathematics to alleviate 36.5h faculty overtime before upcoming mid-term assessments.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <Link to="/preventive-actions">
              <button className="btn btn-secondary btn-sm">Review Preventive Actions</button>
            </Link>
            <Link to="/anomalies">
              <button className="btn btn-primary btn-sm">Inspect 4 Anomalies</button>
            </Link>
          </div>
        </Card>

        <Card title="Quick Operational Actions" subtitle="Supervisor task assignment & scenario simulations">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Link to="/tasks" style={{ textDecoration: "none" }}>
              <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#f8fafc", textAlign: "center" }}>
                <div style={{ fontWeight: "700", color: "var(--primary)" }}>Task Assignment Board</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>5 Active Operational Tasks</div>
              </div>
            </Link>
            <Link to="/forecast-capacity" style={{ textDecoration: "none" }}>
              <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "#f8fafc", textAlign: "center" }}>
                <div style={{ fontWeight: "700", color: "var(--primary)" }}>Capacity Heatmaps</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Faculty & Room Overloads</div>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}