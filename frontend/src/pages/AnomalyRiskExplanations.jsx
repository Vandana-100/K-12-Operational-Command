import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, DomainBadge, LoadingSpinner, Modal } from "../components/CommonUI";
import { IconAnomalies, IconRefresh, IconCheck, IconX, IconAlertTriangle } from "../components/Icons";

export default function AnomalyRiskExplanations() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthorized = user.role === "Operations Admin" || user.role === "Operations Manager";

  const [anomalies, setAnomalies] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Review Modal State
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("Acknowledge");
  const [reviewReason, setReviewReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [anomRes, compRes] = await Promise.all([
        axios.get("https://k-12-operational-command.onrender.com/api/anomalies", { headers }),
        axios.get("https://k-12-operational-command.onrender.com/api/anomalies/comparison", { headers })
      ]);

      setAnomalies(anomRes.data.anomalies || []);
      setComparisons(compRes.data || []);
    } catch (e) {
      console.error("Failed to load anomalies:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("https://k-12-operational-command.onrender.com/api/anomalies/detect", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadData();
    } catch (e) {
      alert("Failed to run anomaly detection scan");
    } finally {
      setScanning(false);
    }
  };

  const openReviewModal = (anom, decision) => {
    setSelectedAnomaly(anom);
    setReviewDecision(decision);
    setReviewReason("");
    setReviewMessage("");
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewReason || reviewReason.trim().length < 5) {
      alert("A mandatory operational reason (at least 5 characters) is required.");
      return;
    }

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`https://k-12-operational-command.onrender.com/api/anomalies/${selectedAnomaly.id}/acknowledge`, {
        notes: `${reviewDecision}: ${reviewReason}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReviewMessage(`Anomaly marked as ${reviewDecision.toLowerCase()}ed.`);
      setTimeout(() => {
        setSelectedAnomaly(null);
        loadData();
      }, 1500);
    } catch (e) {
      alert("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Anomaly & Risk Explanations
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-time statistical anomaly detection with explainable contributing factors and human review governance.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleScan} disabled={scanning}>
          <IconRefresh size={14} />
          <span>{scanning ? "Scanning Operational Streams..." : "Trigger Real-Time Scan"}</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Evaluating operational telemetry against dynamic baseline boundaries..." />
      ) : (
        <>
          {/* ACTIVE ANOMALIES LIST */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "28px" }}>
            {anomalies.map(anom => {
              const isCrit = anom.severity === "Critical";
              const isHigh = anom.severity === "High";
              const sevClass = isCrit ? "badge-danger" : isHigh ? "badge-warning" : "badge-info";

              return (
                <div key={anom.id} className="card" style={{ borderLeft: `5px solid ${isCrit ? "#ef4444" : isHigh ? "#f59e0b" : "#3b82f6"}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <DomainBadge domain={anom.domain} />
                      <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
                        {anom.metric}
                      </h3>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className={`badge ${sevClass}`}>
                        {anom.severity} Severity
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Confidence: <strong>{anom.confidence}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* Metric Comparison Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "8px", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Observed Value</div>
                      <div style={{ fontSize: "22px", fontWeight: "700", color: isCrit ? "#dc2626" : "var(--text-main)" }}>
                        {anom.actual_value}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Expected Baseline</div>
                      <div style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-main)" }}>
                        {anom.expected_value}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Deviation Gap</div>
                      <div style={{ fontSize: "22px", fontWeight: "700", color: "#dc2626" }}>
                        {anom.difference > 0 ? `+${anom.difference}` : anom.difference}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Status</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: anom.status === "Acknowledged" ? "#10b981" : "#f59e0b", marginTop: "4px" }}>
                        {anom.status}
                      </div>
                    </div>
                  </div>

                  {/* Natural Language Explanation Box */}
                  <div className="ai-explanation-box">
                    <div style={{ fontWeight: "700", marginBottom: "4px", color: "#4f46e5" }}>
                      Operational Diagnostic & Root Cause Explanation
                    </div>
                    <div>{anom.explanation}</div>
                  </div>

                  {/* Contributing Factors */}
                  {anom.contributing_factors && anom.contributing_factors.length > 0 && (
                    <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--navy-700)", textTransform: "uppercase", marginBottom: "6px" }}>
                        Contributing Drivers & Observations
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {anom.contributing_factors.map((factor, idx) => (
                          <div key={idx} style={{ padding: "4px 10px", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "12px" }}>
                            {typeof factor === "string" ? factor : `${factor.factor} (${factor.contribution})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Human Review Actions */}
                  {isAuthorized && anom.status !== "Acknowledged" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Supervisor confirmation required before dispatching tasks
                      </span>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => openReviewModal(anom, "Acknowledge")}
                        >
                          <IconCheck size={14} />
                          <span>Acknowledge & Confirm</span>
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openReviewModal(anom, "Override")}
                        >
                          <span>Override / Dismiss</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PREDICTED VS ACTUAL OUTCOMES COMPARISON TABLE */}
          <Card
            title="Predicted vs. Actual Operational Outcomes Tracking"
            subtitle="Comparing pre-incident AI predictions against actual observed telemetry to evaluate accuracy"
          >
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Target Operational Metric</th>
                    <th>AI Forecast</th>
                    <th>Observed Actual</th>
                    <th>Variance Gap</th>
                    <th>Accuracy %</th>
                    <th>Evaluation Status</th>
                    <th>Evaluated Date</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, idx) => (
                    <tr key={idx}>
                      <td><DomainBadge domain={c.domain} /></td>
                      <td style={{ fontWeight: "600" }}>{c.metric}</td>
                      <td>{c.predicted}</td>
                      <td style={{ fontWeight: "700" }}>{c.actual}</td>
                      <td style={{ color: "#2563eb", fontWeight: "600" }}>{c.difference}</td>
                      <td>
                        <span className="badge badge-success font-bold">
                          {c.accuracyPct}%
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.evaluatedDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* REVIEW ANOMALY MODAL */}
      <Modal
        isOpen={Boolean(selectedAnomaly)}
        onClose={() => setSelectedAnomaly(null)}
        title={`${reviewDecision} Anomaly #${selectedAnomaly?.id}: ${selectedAnomaly?.metric}`}
      >
        {selectedAnomaly && (
          <form onSubmit={submitReview}>
            <p style={{ fontSize: "13.5px", color: "var(--navy-700)", marginBottom: "14px" }}>
              Confirm your operational acknowledgement for this {selectedAnomaly.severity.toLowerCase()} severity deviation.
            </p>

            <div className="form-group">
              <label className="form-label">Mandatory Reviewer Reason / Operational Action</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Detail planned mitigation or reason for overriding this alert..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                required
              />
            </div>

            {reviewMessage && (
              <div style={{ padding: "10px", backgroundColor: "#ecfdf5", color: "#065f46", borderRadius: "6px", fontSize: "13px", marginBottom: "14px" }}>
                {reviewMessage}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedAnomaly(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                {submittingReview ? "Recording..." : `Confirm ${reviewDecision}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
