const express = require("express");
const db = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/notifications
router.get("/notifications", authenticateToken, (req, res) => {
  try {
    const { filter = "All" } = req.query;

    let query = `
      SELECT * FROM notifications
      WHERE (user_id = ? OR user_id IS NULL OR role = ? OR role = 'All')
    `;
    const params = [req.user.userId, req.user.role];

    if (filter === "Unread") {
      query += " AND is_read = 0";
    } else if (filter === "Critical") {
      query += " AND severity = 'Critical'";
    } else if (filter === "Tasks") {
      query += " AND type = 'task'";
    } else if (filter === "Anomalies") {
      query += " AND type = 'anomaly'";
    }

    query += " ORDER BY id DESC LIMIT 50";

    const notifications = db.prepare(query).all(...params);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE is_read = 0 AND (user_id = ? OR user_id IS NULL OR role = ? OR role = 'All')
    `).get(req.user.userId, req.user.role)?.count || 0;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// PUT /api/notifications/:id/read
router.put("/notifications/:id/read", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    res.json({ message: "Notification marked as read", id });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// PUT /api/notifications/read-all
router.put("/notifications/read-all", authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE (user_id = ? OR user_id IS NULL OR role = ? OR role = 'All')
    `).run(req.user.userId, req.user.role);

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// DELETE /api/notifications/:id
router.delete("/notifications/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
    res.json({ message: "Notification dismissed", id });
  } catch (error) {
    res.status(500).json({ message: "Failed to dismiss notification" });
  }
});

// GET /api/notifications/preferences
router.get("/notifications/preferences", authenticateToken, (req, res) => {
  try {
    let prefs = db.prepare("SELECT * FROM notification_preferences WHERE user_id = ?").get(req.user.userId);
    if (!prefs) {
      db.prepare(`
        INSERT INTO notification_preferences (user_id, email_alerts, in_app_alerts, sla_critical, anomalies, task_updates)
        VALUES (?, 1, 1, 1, 1, 1)
      `).run(req.user.userId);
      prefs = db.prepare("SELECT * FROM notification_preferences WHERE user_id = ?").get(req.user.userId);
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notification preferences" });
  }
});

// PUT /api/notifications/preferences
router.put("/notifications/preferences", authenticateToken, (req, res) => {
  try {
    const { email_alerts, in_app_alerts, sla_critical, anomalies, task_updates } = req.body;
    db.prepare(`
      UPDATE notification_preferences
      SET email_alerts = ?, in_app_alerts = ?, sla_critical = ?, anomalies = ?, task_updates = ?
      WHERE user_id = ?
    `).run(
      email_alerts ? 1 : 0,
      in_app_alerts ? 1 : 0,
      sla_critical ? 1 : 0,
      anomalies ? 1 : 0,
      task_updates ? 1 : 0,
      req.user.userId
    );
    res.json({ message: "Notification preferences updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update preferences" });
  }
});

module.exports = router;
