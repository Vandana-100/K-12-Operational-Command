import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, DomainBadge, SlaBadge, PriorityBadge, Drawer, LoadingSpinner, EmptyState } from "../components/CommonUI";
import { IconSearch, IconFilter, IconPlus, IconRefresh, IconCheck, IconX } from "../components/Icons";

const DOMAINS = [
  "All",
  "Admission",
  "Timetable Planning",
  "Teaching",
  "Assessment",
  "Attendance",
  "Parent Communication",
  "Support Intervention",
  "Reporting"
];

export default function LiveWorkflowQueues() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isFieldStaff = user.role === "Field Staff";

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedSla, setSelectedSla] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer detail state
  const [activeItem, setActiveItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // New ticket modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState("Attendance");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDueTime, setNewDueTime] = useState("Within 24h");
  const [newDescription, setNewDescription] = useState("");

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `http://localhost:4000/api/workflows?domain=${selectedDomain}&priority=${selectedPriority}&sla_risk=${selectedSla}&status=${selectedStatus}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkflows(res.data.workflows || []);
    } catch (err) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [selectedDomain, selectedPriority, selectedSla, selectedStatus]);

  const openItemDetails = async (item) => {
    setActiveItem(item);
    setIsDrawerOpen(true);
    setActionNotes("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:4000/api/workflows/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItemHistory(res.data.history || []);
    } catch (e) {}
  };

  const handleStatusChange = async (newStatus) => {
    if (!activeItem) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`http://localhost:4000/api/workflows/${activeItem.id}`, {
        status: newStatus,
        notes: actionNotes || `Status updated to ${newStatus}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveItem(res.data.item);
      loadWorkflows();
      // refresh history
      const histRes = await axios.get(`http://localhost:4000/api/workflows/${activeItem.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItemHistory(histRes.data.history || []);
      setActionNotes("");
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleEscalate = async () => {
    if (!activeItem) return;
    const reason = prompt("Enter justification for SLA Escalation to Critical:", "Imminent service level failure requires director dispatch.");
    if (!reason) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`http://localhost:4000/api/workflows/${activeItem.id}/escalate`, {
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveItem(res.data.item);
      loadWorkflows();
      const histRes = await axios.get(`http://localhost:4000/api/workflows/${activeItem.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItemHistory(histRes.data.history || []);
    } catch (err) {
      alert("Failed to escalate workflow item");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:4000/api/workflows", {
        domain: newDomain,
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        due_time: newDueTime
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      loadWorkflows();
    } catch (err) {
      alert("Failed to create workflow ticket");
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Live Workflow Queues
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Operational queues covering all 8 functional streams with real-time SLA risk monitoring.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={loadWorkflows}>
            <IconRefresh size={14} />
            <span>Refresh</span>
          </button>
          {!isFieldStaff && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              <IconPlus size={14} />
              <span>Create Queue Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Domain Quick Tabs */}
      <div style={{
        display: "flex",
        gap: "6px",
        overflowX: "auto",
        paddingBottom: "10px",
        marginBottom: "16px"
      }}>
        {DOMAINS.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDomain(d)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: selectedDomain === d ? "var(--primary)" : "var(--border-color)",
              backgroundColor: selectedDomain === d ? "var(--primary)" : "#ffffff",
              color: selectedDomain === d ? "#ffffff" : "var(--text-main)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s"
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <input
            type="text"
            className="input"
            placeholder="Search tickets, owners, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadWorkflows()}
            style={{ paddingLeft: "34px" }}
          />
          <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <IconSearch size={16} />
          </div>
        </div>

        {/* Priority Filter */}
        <div style={{ minWidth: "140px" }}>
          <select className="select" value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* SLA Risk Filter */}
        <div style={{ minWidth: "140px" }}>
          <select className="select" value={selectedSla} onChange={(e) => setSelectedSla(e.target.value)}>
            <option value="All">All SLA States</option>
            <option value="Breached">Breached</option>
            <option value="At Risk">At Risk</option>
            <option value="On Track">On Track</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: "140px" }}>
          <select className="select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Workflow Queues Table */}
      {loading ? (
        <LoadingSpinner message="Querying live operational queues..." />
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No workflow items match current criteria"
          message="Adjust your search filters or domain selection above."
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setSelectedDomain("All");
              setSelectedPriority("All");
              setSelectedSla("All");
              setSelectedStatus("All");
              setSearchQuery("");
            }}>
              Clear All Filters
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>ID</th>
                <th>Domain</th>
                <th>Workflow Title</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Due Time</th>
                <th>SLA Risk</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map(item => (
                <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => openItemDetails(item)}>
                  <td style={{ fontWeight: "700", color: "var(--text-muted)" }}>#{item.id}</td>
                  <td><DomainBadge domain={item.domain} /></td>
                  <td>
                    <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{item.title}</div>
                    {item.linked_entity_id && (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ref: {item.linked_entity_id}</span>
                    )}
                  </td>
                  <td style={{ fontSize: "13px" }}>{item.owner_name || "Unassigned"}</td>
                  <td><PriorityBadge priority={item.priority} /></td>
                  <td style={{ fontSize: "13px", fontWeight: "500" }}>{item.due_time || "Within 24h"}</td>
                  <td><SlaBadge risk={item.sla_risk} /></td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontWeight: "600" }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openItemDetails(item);
                      }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={activeItem ? `Queue #${activeItem.id}: ${activeItem.domain}` : "Item Details"}
      >
        {activeItem && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-main)", marginBottom: "6px" }}>
                {activeItem.title}
              </h2>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                <DomainBadge domain={activeItem.domain} />
                <PriorityBadge priority={activeItem.priority} />
                <SlaBadge risk={activeItem.sla_risk} />
                <span className="badge badge-neutral">{activeItem.status}</span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--navy-700)", lineHeight: "1.6" }}>
                {activeItem.description || "No additional description provided."}
              </p>
            </div>

            {/* Metadata Summary */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", marginBottom: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                <div><strong>Assigned Owner:</strong> {activeItem.owner_name || "Unassigned"}</div>
                <div><strong>Campus:</strong> {activeItem.campus_name || "All Campuses"}</div>
                <div><strong>Due SLA:</strong> {activeItem.due_time}</div>
                <div><strong>Linked Entity:</strong> {activeItem.linked_entity_type || "General"} ({activeItem.linked_entity_id || "N/A"})</div>
              </div>
            </div>

            {/* Action Controls */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>
                Operational Actions & Dispatch
              </h3>

              <div className="form-group">
                <label className="form-label">Action Log / Transition Notes</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Provide operational context for this status modification..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleStatusChange("In Progress")}
                  disabled={updating || activeItem.status === "In Progress"}
                >
                  Mark In Progress
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleStatusChange("Resolved")}
                  disabled={updating || activeItem.status === "Resolved"}
                >
                  <IconCheck size={14} />
                  <span>Mark Resolved</span>
                </button>
                {!isFieldStaff && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleEscalate}
                    disabled={updating || activeItem.priority === "Critical"}
                  >
                    Escalate to Critical
                  </button>
                )}
              </div>
            </div>

            {/* Timeline History */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>
                Activity & Audit History
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {itemHistory.map(h => (
                  <div key={h.id} style={{ display: "flex", gap: "10px", fontSize: "12.5px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--primary)", marginTop: "6px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: "600", color: "var(--text-main)" }}>
                        {h.action} by {h.user_name}
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>{h.notes}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px" }}>{h.created_at}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* CREATE ITEM MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">Create Operational Queue Item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}><IconX size={18} /></button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Operational Domain</label>
                  <select className="select" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}>
                    {DOMAINS.filter(d => d !== "All").map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Grade 10 Laboratory Collision"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target SLA Due</label>
                    <input
                      type="text"
                      className="input"
                      value={newDueTime}
                      onChange={(e) => setNewDueTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description & Operational Context</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Provide root-cause observations or supporting evidence..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Queue Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
