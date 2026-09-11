import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Card, LoadingSpinner, EmptyState } from "../components/CommonUI";
import { IconNotifications, IconCheck, IconX, IconRefresh, IconSettings } from "../components/Icons";

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("All"); // "All" | "Unread" | "Critical" | "Tasks" | "Anomalies"
  const [loading, setLoading] = useState(true);

  // Notification Preferences
  const [preferences, setPreferences] = useState({
    email_alerts: 1,
    in_app_alerts: 1,
    sla_critical: 1,
    anomalies: 1,
    task_updates: 1
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [notifRes, prefRes] = await Promise.all([
        axios.get(`http://localhost:4000/api/notifications?filter=${filter}`, { headers }),
        axios.get("http://localhost:4000/api/notifications/preferences", { headers })
      ]);

      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(notifRes.data.unreadCount || 0);
      if (prefRes.data) setPreferences(prefRes.data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:4000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put("http://localhost:4000/api/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const dismissNotification = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {}
  };

  const savePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefsMessage("");
    try {
      const token = localStorage.getItem("token");
      await axios.put("http://localhost:4000/api/notifications/preferences", preferences, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrefsMessage("Alert dispatch preferences updated successfully!");
      setTimeout(() => setPrefsMessage(""), 3000);
    } catch (e) {
      alert("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
            Notifications & Dispatch Center
          </h1>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Operational exceptions, SLA breach alerts, automated AI insights, and task assignments.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <IconCheck size={14} />
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <IconRefresh size={14} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Main Notifications Feed */}
        <div>
          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
            {["All", "Unread", "Critical", "Tasks", "Anomalies"].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`btn ${filter === cat ? "btn-primary" : "btn-secondary"} btn-sm`}
              >
                {cat} {cat === "Unread" && unreadCount > 0 && `(${unreadCount})`}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingSpinner message="Querying live notification dispatch feed..." />
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No notifications in this category"
              message="You are fully caught up on all operational dispatches."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {notifications.map(n => {
                const isCrit = n.severity === "Critical";
                const isUnread = n.is_read === 0;

                return (
                  <div
                    key={n.id}
                    style={{
                      backgroundColor: isUnread ? "#f0fdf4" : "#ffffff",
                      border: "1px solid",
                      borderColor: isUnread ? "#bbf7d0" : "var(--border-color)",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "14px",
                      boxShadow: "var(--shadow-sm)"
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", flex: 1 }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: isCrit ? "#fee2e2" : "#eff6ff",
                        color: isCrit ? "#dc2626" : "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontWeight: "700"
                      }}>
                        {isCrit ? "!" : "⚡"}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: isCrit ? "#fee2e2" : "#e0e7ff",
                            color: isCrit ? "#991b1b" : "#3730a3"
                          }}>
                            {n.type}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {n.created_at}
                          </span>
                          {isUnread && (
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                          )}
                        </div>

                        <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--navy-700)" }}>
                          {n.message}
                        </div>

                        {n.link_url && (
                          <div style={{ marginTop: "8px" }}>
                            <Link to={n.link_url} style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--primary)" }}>
                              Open Associated Operational Record →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {isUnread && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => markAsRead(n.id)}
                          title="Mark as read"
                        >
                          <IconCheck size={16} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => dismissNotification(n.id)}
                        title="Dismiss notification"
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification Preferences Sidebar Card */}
        <div>
          <Card title="Alert Dispatch Preferences" subtitle="Configure automated notification routing based on severity">
            {prefsMessage && (
              <div style={{ padding: "10px", backgroundColor: "#ecfdf5", color: "#065f46", borderRadius: "6px", fontSize: "13px", marginBottom: "14px" }}>
                {prefsMessage}
              </div>
            )}

            <form onSubmit={savePreferences}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.in_app_alerts)}
                    onChange={(e) => setPreferences({ ...preferences, in_app_alerts: e.target.checked ? 1 : 0 })}
                  />
                  <span><strong>In-App Notification Feed</strong> (Active)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.email_alerts)}
                    onChange={(e) => setPreferences({ ...preferences, email_alerts: e.target.checked ? 1 : 0 })}
                  />
                  <span><strong>Email Priority Alerts</strong> (Critical only)</span>
                </label>

                <hr style={{ borderColor: "var(--border-color)" }} />

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.sla_critical)}
                    onChange={(e) => setPreferences({ ...preferences, sla_critical: e.target.checked ? 1 : 0 })}
                  />
                  <span>SLA Breaches & Urgent Escalations</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.anomalies)}
                    onChange={(e) => setPreferences({ ...preferences, anomalies: e.target.checked ? 1 : 0 })}
                  />
                  <span>Statistical Telemetry Anomalies</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.task_updates)}
                    onChange={(e) => setPreferences({ ...preferences, task_updates: e.target.checked ? 1 : 0 })}
                  />
                  <span>Task Reassignments & Status Handshakes</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ width: "100%", marginTop: "20px" }}
                disabled={savingPrefs}
              >
                {savingPrefs ? "Saving..." : "Save Preferences"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
