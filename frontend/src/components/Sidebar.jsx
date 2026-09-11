import React from "react";
import { NavLink } from "react-router-dom";
import {
  IconDashboard,
  IconWorkflow,
  IconForecast,
  IconTasks,
  IconPredictions,
  IconAnomalies,
  IconPreventive,
  IconReports,
  IconNotifications,
  IconUsers,
  IconAudit,
} from "./Icons";

export default function Sidebar({ isOpen, onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || "Operations Analyst";
  const isAdmin = role === "Operations Admin";
  const isStaff = role === "Field Staff";

  // Close sidebar when a nav link is clicked (mobile UX)
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const navItem = (to, Icon, label, badge) => (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
      onClick={handleNavClick}
    >
      <span className="nav-link-content">
        <Icon size={16} />
        <span>{label}</span>
      </span>
      {badge && <span className="nav-badge">{badge}</span>}
    </NavLink>
  );

  return (
    <aside className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
      <nav className="sidebar-nav">
        <div className="sidebar-heading">Operations</div>
        {navItem("/dashboard",          IconDashboard,     "Dashboard")}
        {navItem("/workflows",          IconWorkflow,      "Live Queues",        "16")}
        {navItem("/forecast-capacity",  IconForecast,      "Forecast & Capacity")}
        {navItem("/tasks",              IconTasks,         "Tasks & Scenarios",   "5")}

        <div className="sidebar-heading">AI Intelligence</div>
        {navItem("/predictions",        IconPredictions,   "Demand Predictions",  "AI")}
        {navItem("/anomalies",          IconAnomalies,     "Anomaly Detection",   "4")}
        {navItem("/preventive-actions", IconPreventive,    "Preventive Actions")}

        <div className="sidebar-heading">Analytics</div>
        {navItem("/reports",            IconReports,       "Reports & Analytics")}
        {navItem("/notifications",      IconNotifications, "Notifications")}

        {!isStaff && (
          <>
            <div className="sidebar-heading">Administration</div>
            {isAdmin && navItem("/users", IconUsers, "User Management")}
            {navItem("/audit-settings", IconAudit, "Audit & Settings")}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <span>Engine Status</span>
          <span className="engine-status">● v2.4 Active</span>
        </div>
        <div style={{ fontSize: 11, marginTop: 3, color: "var(--text-tertiary)" }}>
          {role}
        </div>
      </div>
    </aside>
  );
}
