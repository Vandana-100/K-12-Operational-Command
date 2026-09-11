import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, LoadingSpinner, Modal } from "../components/CommonUI";
import { IconUsers, IconPlus, IconRefresh, IconSearch, IconCheck, IconX } from "../components/Icons";

const ROLES = ["Operations Admin", "Operations Manager", "Operations Analyst", "Field Staff"];

export default function UserRoleManagement() {
  const [users, setUsers] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Create/Edit User Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("Operations Analyst");
  const [formCampus, setFormCampus] = useState("");
  const [formDepartment, setFormDepartment] = useState("Operations");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = "http://localhost:4000/api/users";
      if (selectedRole !== "All") url += `?role=${encodeURIComponent(selectedRole)}`;
      if (searchQuery) url += `${selectedRole !== "All" ? "&" : "?"}search=${encodeURIComponent(searchQuery)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users || []);
      setCampuses(res.data.campuses || []);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("Operations Analyst");
    setFormCampus(campuses[0]?.id || "");
    setFormDepartment("Operations");
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole(u.role);
    setFormCampus(u.campus_id || "");
    setFormDepartment(u.department || "Operations");
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editingUser) {
        await axios.put(`http://localhost:4000/api/users/${editingUser.id}`, {
          name: formName,
          role: formRole,
          campus_id: formCampus ? Number(formCampus) : null,
          department: formDepartment,
          password: formPassword || undefined
        }, { headers });
      } else {
        await axios.post("http://localhost:4000/api/users", {
          name: formName,
          email: formEmail,
          password: formPassword || "admin123",
          role: formRole,
          campus_id: formCampus ? Number(formCampus) : null,
          department: formDepartment
        }, { headers });
      }

      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save user profile");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (u) => {
    const nextStatus = u.status === "active" ? "inactive" : "active";
    if (!window.confirm(`Are you sure you want to change status of ${u.name} to ${nextStatus}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:4000/api/users/${u.id}/status`, { status: nextStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to modify user status");
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            User & Role Management
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Least-privilege role-based access control, campus tenant assignment, and identity administration.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={loadUsers}>
            <IconRefresh size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <IconPlus size={14} />
            <span>Provision New User</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <input
            type="text"
            className="input"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers()}
            style={{ paddingLeft: "34px" }}
          />
          <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <IconSearch size={16} />
          </div>
        </div>

        <div style={{ minWidth: "180px" }}>
          <select className="select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner message="Querying staff & administrator identity directory..." />
      ) : (
        <div className="table-container mb-6">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Assigned Role</th>
                <th>Department</th>
                <th>Campus Scoping</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "50%",
                        backgroundColor: "#e0e7ff", color: "#3730a3",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "700", fontSize: "13px"
                      }}>
                        {u.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{u.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === "Operations Admin" ? "badge-danger" : u.role === "Operations Manager" ? "badge-warning" : "badge-info"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: "13px" }}>{u.department || "Operations"}</td>
                  <td>
                    <span className="badge badge-neutral">
                      {u.campus_name || "All Campuses"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === "active" ? "badge-success" : "badge-danger"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {u.last_login ? u.last_login.slice(0, 16).replace("T", " ") : "Never"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(u)}>
                        Edit
                      </button>
                      <button
                        className={`btn ${u.status === "active" ? "btn-danger" : "btn-success"} btn-sm`}
                        onClick={() => toggleUserStatus(u)}
                      >
                        {u.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RBAC PERMISSION MATRIX VIEWER */}
      <Card title="Least-Privilege Role Authorization Matrix" subtitle="Domain and permission boundaries enforced at the server API layer">
        <div className="table-container">
          <table className="data-table" style={{ fontSize: "13px" }}>
            <thead>
              <tr>
                <th>Operational Capability</th>
                <th>Operations Admin</th>
                <th>Operations Manager</th>
                <th>Operations Analyst</th>
                <th>Field Staff</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>View Real-Time Dashboard & Telemetry</strong></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-neutral">Assigned Scope</span></td>
              </tr>
              <tr>
                <td><strong>Manage Workflow Queues (8 Domains)</strong></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-neutral">Read Only</span></td>
                <td><span className="badge badge-neutral">Assigned Queues</span></td>
              </tr>
              <tr>
                <td><strong>Material AI Approval & Overrides</strong></td>
                <td><span className="badge badge-success">✓ Authorized</span></td>
                <td><span className="badge badge-success">✓ Authorized</span></td>
                <td><span className="badge badge-danger">✗ Read Only</span></td>
                <td><span className="badge badge-danger">✗ Restricted</span></td>
              </tr>
              <tr>
                <td><strong>Task Escalation & Scenario Simulations</strong></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-success">✓ Full Scope</span></td>
                <td><span className="badge badge-success">✓ Read / Simulate</span></td>
                <td><span className="badge badge-neutral">Update Status</span></td>
              </tr>
              <tr>
                <td><strong>System Settings, AI Keys & User Directory</strong></td>
                <td><span className="badge badge-success">✓ Full Control</span></td>
                <td><span className="badge badge-danger">✗ Restricted</span></td>
                <td><span className="badge badge-danger">✗ Restricted</span></td>
                <td><span className="badge badge-danger">✗ Restricted</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : "Provision New Operations User"}
      >
        <form onSubmit={handleSaveUser}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text" className="input" placeholder="e.g. Elena Rostova"
              value={formName} onChange={(e) => setFormName(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="input" placeholder="e.g. staff@school.com"
              value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
              disabled={Boolean(editingUser)} required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">Assigned Role</label>
              <select className="select" value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Campus Scope</label>
              <select className="select" value={formCampus} onChange={(e) => setFormCampus(e.target.value)}>
                <option value="">All Campuses (District-Wide)</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text" className="input" value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{editingUser ? "Change Password (optional)" : "Password"}</label>
              <input
                type="password" className="input" placeholder={editingUser ? "Leave blank to keep current" : "Minimum 6 chars"}
                value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                required={!editingUser}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingUser ? "Update User Profile" : "Provision User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
