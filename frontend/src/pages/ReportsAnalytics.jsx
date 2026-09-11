import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, LoadingSpinner } from "../components/CommonUI";
import { IconReports, IconDownload, IconRefresh } from "../components/Icons";

export default function ReportsAnalytics() {
  const [reportSummary, setReportSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [reportType, setReportType] = useState("workflows"); // "workflows" | "students" | "teachers" | "kpis"
  const [dateRange, setDateRange] = useState("Term 1 (Aug - Dec 2026)");
  const [campusScope, setCampusScope] = useState("All");

  const loadReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, histRes] = await Promise.all([
        axios.get("http://localhost:4000/api/reports/summary", { headers }),
        axios.get("http://localhost:4000/api/reports/history", { headers })
      ]);

      setReportSummary(summaryRes.data);
      setHistory(histRes.data || []);
    } catch (e) {
      console.error("Failed to load report analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:4000/api/reports/export/csv?reportType=${reportType}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });

      // Create download link
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `k12_operations_${reportType}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Refresh history
      loadReportData();
    } catch (e) {
      alert("Failed to export report as CSV");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Aggregating District Operational Audit & Compliance Reports..." />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Reports & Operational Analytics
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Comprehensive compliance reporting, statutory filings, and CSV export across all 8 educational streams.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            🖨️ Printable Executive Summary
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportCsv} disabled={exporting}>
            <IconDownload size={14} />
            <span>{exporting ? "Generating CSV..." : "Export Filtered CSV"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div style={{ minWidth: "180px" }}>
          <label className="form-label" style={{ marginBottom: "2px" }}>Report Stream Dataset</label>
          <select className="select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="workflows">Operational Workflow Queues (8 Domains)</option>
            <option value="students">Student Attendance & At-Risk Registry</option>
            <option value="teachers">Faculty Workload & Overtime Audit</option>
            <option value="kpis">District KPI Digest & SLA Pulse</option>
          </select>
        </div>

        <div style={{ minWidth: "160px" }}>
          <label className="form-label" style={{ marginBottom: "2px" }}>Reporting Term</label>
          <select className="select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="Term 1 (Aug - Dec 2026)">Term 1 (Aug - Dec 2026)</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Past Academic Year">Past Academic Year</option>
          </select>
        </div>

        <div style={{ minWidth: "160px" }}>
          <label className="form-label" style={{ marginBottom: "2px" }}>Campus Scope</label>
          <select className="select" value={campusScope} onChange={(e) => setCampusScope(e.target.value)}>
            <option value="All">All District Campuses</option>
            <option value="1">Horizon North Academy</option>
            <option value="2">Oakridge Central Campus</option>
            <option value="3">Riverdale West Campus</option>
          </select>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY REPORT CARD */}
      {reportSummary && (
        <Card
          title="Consolidated Executive Operations Digest"
          subtitle={`Reporting Scope: ${reportSummary.campusScope} • Period: ${reportSummary.reportingPeriod}`}
          className="mb-6"
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Enrolled Students</div>
              <div style={{ fontSize: "24px", fontWeight: "800", marginTop: "4px" }}>{reportSummary.kpis.totalEnrolled}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Active Student Records</div>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>District Attendance</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#ef4444", marginTop: "4px" }}>{reportSummary.kpis.districtAttendanceRate}%</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Seasonal dip observed</div>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Learning Mastery</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", marginTop: "4px" }}>{reportSummary.kpis.averageLearningScore}%</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Pacing on benchmark</div>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Average Faculty Hours</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#3b82f6", marginTop: "4px" }}>{reportSummary.kpis.averageFacultyWorkload}h</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Against 35h contract cap</div>
            </div>
          </div>

          {/* Workflow Domain Breakdown Table */}
          <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>
            Operational Throughput by Domain
          </h4>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Operational Domain</th>
                  <th>Total Initiated Queues</th>
                  <th>Resolved</th>
                  <th>Breached SLA Alerts</th>
                  <th>Resolution Health</th>
                </tr>
              </thead>
              <tbody>
                {reportSummary.workflowSummary?.map(ws => (
                  <tr key={ws.domain}>
                    <td style={{ fontWeight: "600" }}>{ws.domain}</td>
                    <td>{ws.total}</td>
                    <td><span style={{ color: "#10b981", fontWeight: "600" }}>{ws.resolved || 0}</span></td>
                    <td><span style={{ color: ws.breached > 0 ? "#dc2626" : "inherit", fontWeight: "600" }}>{ws.breached || 0}</span></td>
                    <td>
                      <span className={`badge ${ws.breached > 0 ? "badge-danger" : "badge-success"}`}>
                        {ws.breached > 0 ? "SLA Breaches" : "On Track"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT GENERATION AUDIT HISTORY */}
      <Card
        title="Report Generation & Export Audit Log"
        subtitle="Historical records of previously exported spreadsheets and compliance filings"
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report Title</th>
                <th>Format</th>
                <th>Generated By</th>
                <th>Status</th>
                <th>Generated Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                    No reports generated yet. Click "Export Filtered CSV" above.
                  </td>
                </tr>
              ) : (
                history.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: "600" }}>{h.title}</td>
                    <td><span className="badge badge-info font-bold">{h.file_format}</span></td>
                    <td>{h.generated_by}</td>
                    <td><span className="badge badge-success font-bold">{h.status}</span></td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{h.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
