import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, DomainBadge, LoadingSpinner, Badge, Modal } from "../components/CommonUI";
import { IconBrain, IconRefresh, IconCheck, IconX, IconAlertTriangle } from "../components/Icons";

export default function DemandPredictions() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthorized = user.role === "Operations Admin" || user.role === "Operations Manager";

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState("All");

  // Decision modal state
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [decisionType, setDecisionType] = useState("Approve");
  const [decisionReason, setDecisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState("");

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://k-12-operational-command.onrender.com/api/predictions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPredictions(res.data.predictions || []);
    } catch (err) {
      console.error("Failed to load predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("https://k-12-operational-command.onrender.com/api/predictions/refresh", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadPredictions();
    } catch (e) {
      alert("Failed to refresh predictions");
    } finally {
      setRefreshing(false);
    }
  };

  const openDecisionModal = (prediction, decision) => {
    setSelectedPrediction(prediction);
    setDecisionType(decision);
    setDecisionReason("");
    setDecisionFeedback("");
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    if (!decisionReason || decisionReason.trim().length < 5) {
      alert("A mandatory justification (at least 5 characters) is required.");
      return;
    }

    setSubmittingDecision(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("https://k-12-operational-command.onrender.com/api/predictions/decision", {
        predictionId: selectedPrediction.id,
        decision: decisionType,
        reason: decisionReason,
        targetDomain: selectedPrediction.domain,
        recommendedAction: `Mitigate ${selectedPrediction.domain} risk: ${selectedPrediction.predicted_value}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDecisionFeedback(res.data.message);
      setTimeout(() => {
        setSelectedPrediction(null);
        loadPredictions();
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to record decision");
    } finally {
      setSubmittingDecision(false);
    }
  };

  const filteredPredictions = selectedDomain === "All"
    ? predictions
    : predictions.filter(p => p.domain === selectedDomain);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Demand & Workload Predictions
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Multi-stream forecasting across all educational domains with confidence intervals & observable input snapshots.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          <IconRefresh size={14} />
          <span>{refreshing ? "Recalculating..." : "Refresh Forecast Models"}</span>
        </button>
      </div>

      {/* Domain Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "20px" }}>
        {["All", "Attendance", "Teacher Workload", "Support Intervention"].map(d => (
          <button
            key={d}
            onClick={() => setSelectedDomain(d)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: selectedDomain === d ? "var(--primary)" : "var(--border-color)",
              backgroundColor: selectedDomain === d ? "var(--primary)" : "#ffffff",
              color: selectedDomain === d ? "#ffffff" : "var(--text-main)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Querying multi-stream predictive models..." />
      ) : filteredPredictions.length === 0 ? (
        <Card>
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No predictions found for {selectedDomain}.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {filteredPredictions.map(p => {
            const isCritical = p.risk_level === "Critical" || p.risk_level === "High";
            return (
              <div key={p.id} className="card" style={{ borderLeft: `5px solid ${isCritical ? "#ef4444" : "#10b981"}` }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <DomainBadge domain={p.domain} />
                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                      {p.prediction_type} ({p.target_entity})
                    </h3>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Model: <code>{p.model_version || "gemini-hybrid-v2.4"}</code>
                    </span>
                    <span className={`badge ${isCritical ? "badge-danger" : "badge-success"}`}>
                      {p.risk_level} Risk
                    </span>
                  </div>
                </div>

                {/* Main Prediction Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>
                      Projected Value
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: isCritical ? "#dc2626" : "var(--text-main)" }}>
                      {p.predicted_value}
                      <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginLeft: "4px" }}>
                        {p.domain === "Teacher Workload" ? "hrs/wk" : p.domain === "Attendance" ? "%" : "cases"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>
                      Observed Actual Baseline
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
                      {p.actual_value}
                      <span style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginLeft: "4px" }}>
                        {p.domain === "Teacher Workload" ? "hrs/wk" : p.domain === "Attendance" ? "%" : "cases"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>
                      Statistical Confidence
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#2563eb" }}>
                      {p.confidence}%
                    </div>
                    <div style={{ width: "100%", height: "4px", backgroundColor: "#e2e8f0", borderRadius: "2px", marginTop: "4px" }}>
                      <div style={{ width: `${p.confidence}%`, height: "100%", backgroundColor: "#2563eb", borderRadius: "2px" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>
                      Evaluation Horizon
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "6px" }}>
                      Next 14 - 30 School Days
                    </div>
                  </div>
                </div>

                {/* Natural Language Operational Explanation */}
                <div className="ai-explanation-box">
                  <div style={{ fontWeight: "700", marginBottom: "4px", color: "#4338ca", display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconBrain size={16} />
                    <span>Evidence-Based Operational Synthesis</span>
                  </div>
                  <div>{p.explanation}</div>
                </div>

                {/* Contributing Input Drivers */}
                {p.contributing_factors && p.contributing_factors.length > 0 && (
                  <div style={{ marginTop: "14px", marginBottom: "16px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--navy-700)", textTransform: "uppercase", marginBottom: "8px" }}>
                      Top Contributing Observation Drivers
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {p.contributing_factors.map((f, i) => (
                        <div key={i} style={{ padding: "6px 12px", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "12.5px" }}>
                          <strong>{f.factor}</strong>: <span style={{ color: "#2563eb", fontWeight: "700" }}>{f.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Review & Governance Control Bar */}
                {isAuthorized && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: "10px" }}>
                    <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                      Mandatory Human Approval Active • Material actions require supervisory authorization
                    </span>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => openDecisionModal(p, "Approve")}
                      >
                        <IconCheck size={14} />
                        <span>Approve Mitigation</span>
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDecisionModal(p, "Override")}
                      >
                        <span>Override</span>
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => openDecisionModal(p, "Reject")}
                      >
                        <IconX size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HUMAN REVIEW DECISION MODAL */}
      <Modal
        isOpen={Boolean(selectedPrediction)}
        onClose={() => setSelectedPrediction(null)}
        title={`Human Governance Review: ${decisionType} Prediction #${selectedPrediction?.id}`}
      >
        {selectedPrediction && (
          <form onSubmit={submitDecision}>
            <p style={{ fontSize: "13.5px", color: "var(--navy-700)", marginBottom: "14px" }}>
              You are about to record a material decision (<strong>{decisionType}</strong>) for domain <strong>{selectedPrediction.domain}</strong>.
            </p>

            <div className="form-group">
              <label className="form-label">Mandatory Decision Justification / Operational Reason</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Enter mandatory justification for the compliance audit trail..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                required
              />
              <div className="form-hint">Recorded permanently in immutable audit logs with your signature and timestamp.</div>
            </div>

            {decisionType === "Approve" && (
              <div style={{ padding: "10px 14px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "12.5px", color: "#1e40af", marginBottom: "14px" }}>
                ✓ Approving this recommendation will automatically provision an operational task in the supervisor queue.
              </div>
            )}

            {decisionFeedback && (
              <div style={{ padding: "10px", backgroundColor: "#ecfdf5", color: "#065f46", borderRadius: "6px", fontSize: "13px", marginBottom: "14px" }}>
                {decisionFeedback}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPrediction(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${decisionType === "Reject" ? "btn-danger" : "btn-primary"}`}
                disabled={submittingDecision}
              >
                {submittingDecision ? "Recording..." : `Confirm ${decisionType}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
