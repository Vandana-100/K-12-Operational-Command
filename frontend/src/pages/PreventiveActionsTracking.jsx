import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, DomainBadge, LoadingSpinner, Badge, Modal } from "../components/CommonUI";
import { IconPreventive, IconRefresh, IconCheck, IconX, IconBrain } from "../components/Icons";

export default function PreventiveActionsTracking() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAuthorized = user.role === "Operations Admin" || user.role === "Operations Manager";

  const [actions, setActions] = useState([]);
  const [modelHealth, setModelHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Decision Modal
  const [activeAction, setActiveAction] = useState(null);
  const [decisionType, setDecisionType] = useState("Approved");
  const [decisionReason, setDecisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Feedback Modal
  const [feedbackAction, setFeedbackAction] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [actionRes, healthRes] = await Promise.all([
        axios.get("https://k-12-operational-command.onrender.com/api/preventive-actions", { headers }),
        axios.get("https://k-12-operational-command.onrender.com/api/preventive-actions/model-health", { headers })
      ]);

      setActions(actionRes.data.actions || []);
      setModelHealth(healthRes.data || null);
    } catch (e) {
      console.error("Failed to load preventive actions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecute = async (actionId) => {
    if (!window.confirm("Execute this preventive action? This will provision linked operational tasks and initiate outcome monitoring.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`https://k-12-operational-command.onrender.com/api/preventive-actions/${actionId}/execute`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      loadData();
    } catch (e) {
      alert("Failed to execute preventive action");
    }
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    if (!decisionReason || decisionReason.trim().length < 5) {
      alert("Mandatory justification (at least 5 characters) required.");
      return;
    }

    setSubmittingDecision(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`https://k-12-operational-command.onrender.com/api/preventive-actions/${activeAction.id}/decision`, {
        decision: decisionType,
        reason: decisionReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveAction(null);
      loadData();
    } catch (e) {
      alert("Failed to record decision");
    } finally {
      setSubmittingDecision(false);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`https://k-12-operational-command.onrender.com/api/preventive-actions/${feedbackAction.id}/feedback`, {
        rating: Number(rating),
        feedback_text: feedbackText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedbackAction(null);
      setFeedbackText("");
      loadData();
    } catch (e) {
      alert("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading AI preventive recommendations & operational health..." />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Preventive Actions & Outcome Tracking
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            AI-recommended proactive interventions with expected percentage impact and closed-loop validation.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <IconRefresh size={14} />
          <span>Refresh Recommendations</span>
        </button>
      </div>

      {/* AI MODEL OPERATIONAL HEALTH DASHBOARD */}
      {modelHealth && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {/* Accuracy */}
            <div className="card">
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Model Prediction Accuracy
              </div>
              <div style={{ fontSize: "26px", fontWeight: "800", color: "#10b981", margin: "6px 0 2px" }}>
                {modelHealth.accuracyScore}%
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Evaluated against real outcomes
              </div>
            </div>

            {/* Concept Drift */}
            <div className="card">
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Telemetry Concept Drift
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-main)", margin: "8px 0 4px" }}>
                {modelHealth.conceptDriftIndex}
              </div>
              <div style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>
                Within baseline variance
              </div>
            </div>

            {/* Average Latency */}
            <div className="card">
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Inference Latency
              </div>
              <div style={{ fontSize: "26px", fontWeight: "800", color: "var(--primary)", margin: "6px 0 2px" }}>
                {modelHealth.averageInferenceLatencyMs} <span style={{ fontSize: "14px", fontWeight: "500" }}>ms</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Local hybrid synthesis
              </div>
            </div>

            {/* Adoption Rate */}
            <div className="card">
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Supervisor Adoption Rate
              </div>
              <div style={{ fontSize: "26px", fontWeight: "800", color: "#8b5cf6", margin: "6px 0 2px" }}>
                {modelHealth.adoptionRatePct}%
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Recommendations approved
              </div>
            </div>

            {/* User Rating */}
            <div className="card">
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Supervisor Effectiveness Rating
              </div>
              <div style={{ fontSize: "26px", fontWeight: "800", color: "#f59e0b", margin: "6px 0 2px" }}>
                ★ {modelHealth.averageUserRating} <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>/ 5.0</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {modelHealth.totalEvaluatedDecisions} closed-loop evaluations
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVENTIVE ACTIONS LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {actions.map(action => {
          const isPending = action.status === "Pending Review";
          const isApproved = action.status === "Approved";
          const isExecuted = action.status === "Executed";

          return (
            <div key={action.id} className="card" style={{ borderLeft: `5px solid ${isExecuted ? "#10b981" : isApproved ? "#3b82f6" : "#f59e0b"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <DomainBadge domain={action.domain} />
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "var(--text-main)" }}>
                    {action.title}
                  </h3>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={`badge ${isExecuted ? "badge-success" : isApproved ? "badge-info" : "badge-warning"}`}>
                    {action.status}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Recommended by: {action.recommended_by}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "14px", color: "var(--navy-700)", lineHeight: "1.6", marginBottom: "16px" }}>
                {action.description}
              </p>

              {/* Expected Impact & Constraints Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#059669" }}>
                    Expected Operational Impact
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#065f46", marginTop: "4px" }}>
                    {action.expected_impact}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--navy-700)" }}>
                    Operating Assumptions
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {action.assumptions || "Standard district resource availability."}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#dc2626" }}>
                    Compliance & Constraints
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {action.constraints || "Subject to local school board approval."}
                  </div>
                </div>
              </div>

              {/* Outcome Tracking Result if executed */}
              {action.outcome_evaluation && (
                <div style={{ padding: "12px 14px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", marginBottom: "14px", fontSize: "13px" }}>
                  <strong style={{ color: "#065f46" }}>Closed-Loop Outcome Tracking:</strong> {action.outcome_evaluation}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {action.approved_by && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Approved by: <strong>{action.approved_by}</strong> ({action.approved_at?.slice(0, 10)})
                    </span>
                  )}
                  {action.avg_rating && (
                    <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "700" }}>
                      ★ {Number(action.avg_rating).toFixed(1)} / 5 ({action.feedback_count} reviews)
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {isPending && isAuthorized && (
                    <>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => {
                          setActiveAction(action);
                          setDecisionType("Approved");
                          setDecisionReason("");
                        }}
                      >
                        <IconCheck size={14} />
                        <span>Approve Action</span>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          setActiveAction(action);
                          setDecisionType("Rejected");
                          setDecisionReason("");
                        }}
                      >
                        <IconX size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {isApproved && isAuthorized && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleExecute(action.id)}
                    >
                      <span>🚀 Deploy & Execute Mitigation</span>
                    </button>
                  )}

                  {/* Feedback button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setFeedbackAction(action);
                      setRating(5);
                      setFeedbackText("");
                    }}
                  >
                    ★ Rate Effectiveness
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* APPROVE/REJECT MODAL */}
      <Modal
        isOpen={Boolean(activeAction)}
        onClose={() => setActiveAction(null)}
        title={`${decisionType === "Approved" ? "Approve" : "Reject"} Preventive Action #${activeAction?.id}`}
      >
        {activeAction && (
          <form onSubmit={submitDecision}>
            <p style={{ fontSize: "13.5px", color: "var(--navy-700)", marginBottom: "12px" }}>
              Action: <strong>{activeAction.title}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Mandatory Reviewer Justification</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="State operational reasoning for this authorization decision..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveAction(null)}>Cancel</button>
              <button
                type="submit"
                className={`btn ${decisionType === "Approved" ? "btn-success" : "btn-danger"}`}
                disabled={submittingDecision}
              >
                {submittingDecision ? "Submitting..." : `Confirm ${decisionType}`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* RATING FEEDBACK MODAL */}
      <Modal
        isOpen={Boolean(feedbackAction)}
        onClose={() => setFeedbackAction(null)}
        title={`Supervisor Effectiveness Evaluation: Action #${feedbackAction?.id}`}
      >
        {feedbackAction && (
          <form onSubmit={submitFeedback}>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "16px" }}>
              How effective was this preventive recommendation at mitigating operational bottlenecks?
            </p>

            <div className="form-group">
              <label className="form-label">Effectiveness Rating (1 - 5 Stars)</label>
              <select className="select" value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="5">★★★★★ 5 - Highly Effective (Eliminated Bottleneck)</option>
                <option value="4">★★★★☆ 4 - Effective (Recovered Service Level)</option>
                <option value="3">★★★☆☆ 3 - Moderate Impact</option>
                <option value="2">★★☆☆☆ 2 - Limited Impact</option>
                <option value="1">★☆☆☆☆ 1 - Ineffective</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Qualitative Feedback / Model Tuning Notes</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Notes on what worked well or what constraints were encountered..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFeedbackAction(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submittingFeedback}>
                {submittingFeedback ? "Submitting..." : "Submit Evaluation"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
