import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { IconNotifications, IconCheck } from "./Icons";

export default function Navbar({ selectedCampus, onCampusChange, onMenuToggle }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [campuses, setCampuses] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get("https://k-12-operational-command.onrender.com/api/settings/campuses", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setCampuses(res.data)).catch(() => {});

    axios.get("https://k-12-operational-command.onrender.com/api/notifications?filter=Unread", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setNotifications(res.data.notifications?.slice(0, 5) || []);
      setUnreadCount(res.data.unreadCount || 0);
    }).catch(() => {});

    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put("https://k-12-operational-command.onrender.com/api/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications([]);
    } catch (e) {}
  };

  const severityColor = (severity) => {
    if (severity === "Critical") return "var(--danger)";
    if (severity === "High") return "var(--warning)";
    return "var(--accent)";
  };

  return (
    <header className="top-navbar">
      {/* Hamburger — mobile only, hidden on desktop via CSS */}
      <button
        className="hamburger-btn"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Left: Branding */}
      <div className="brand-section">
        <div className="brand-logo-badge">
          <span>K12</span>
        </div>
        <div>
          <div className="brand-title">Apex Academy Command Center</div>
          <div className="brand-subtitle">Predictive Operations</div>
        </div>
      </div>

      {/* Center */}
      <div className="navbar-center">
        <div className="navbar-status-pill">
          <span className="status-dot" />
          <span>All Systems Active</span>
          <span style={{ color: "var(--gray-300)" }}>·</span>
          <span style={{ fontWeight: 600 }}>SLA 98.4%</span>
        </div>

        <select
          className="campus-select"
          value={selectedCampus || "All"}
          onChange={(e) => onCampusChange(e.target.value)}
        >
          <option value="All">All Campuses</option>
          {campuses.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
          ))}
        </select>
      </div>

      {/* Right */}
      <div className="navbar-right">
        {/* Notification Bell */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            title="Notifications"
          >
            <IconNotifications size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 12, padding: "2px 6px" }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                    No unread notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <Link
                      key={n.id}
                      to={n.link_url || "/notifications"}
                      className="notif-item"
                      onClick={() => setShowNotifs(false)}
                    >
                      <div className="flex-between mb-1">
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: severityColor(n.severity) }}>
                          {n.type}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {n.created_at ? n.created_at.slice(11, 16) : "Now"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{n.message}</div>
                    </Link>
                  ))
                )}
              </div>

              <div className="notif-dropdown-footer">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifs(false)}
                  style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex-align gap-2">
          <div className="user-avatar">
            {(user.name || "U")[0]}
          </div>
          <div className="user-info">
            <div className="user-name">{user.name || "User"}</div>
            <span className="user-role-chip">{user.role || "Analyst"}</span>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Logout
        </button>
      </div>
    </header>
  );
}
