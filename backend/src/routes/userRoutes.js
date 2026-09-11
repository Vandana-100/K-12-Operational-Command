const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db/database");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// GET /api/users
router.get("/users", authenticateToken, authorizeRoles("Operations Admin", "Operations Manager"), (req, res) => {
  try {
    const { role, campus_id, search } = req.query;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.campus_id, u.department, u.status, u.last_login, u.created_at,
             c.name as campus_name, c.code as campus_code
      FROM users u
      LEFT JOIN campuses c ON u.campus_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== "All") {
      query += " AND u.role = ?";
      params.push(role);
    }
    if (campus_id && campus_id !== "All") {
      query += " AND u.campus_id = ?";
      params.push(campus_id);
    }
    if (search) {
      query += " AND (u.name LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY u.id ASC";
    const users = db.prepare(query).all(...params);

    const rolesList = ["Operations Admin", "Operations Manager", "Operations Analyst", "Field Staff"];
    const campuses = db.prepare("SELECT id, name, code FROM campuses").all();

    res.json({ users, rolesList, campuses });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Failed to fetch users directory" });
  }
});

// POST /api/users
router.post("/users", authenticateToken, authorizeRoles("Operations Admin"), (req, res) => {
  try {
    const { name, email, password, role, campus_id, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ message: "A user with this email address already exists" });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, campus_id, department, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(
      name.trim(),
      email.trim().toLowerCase(),
      hash,
      role || "Operations Analyst",
      campus_id || null,
      department || "Operations"
    );

    const newId = result.lastInsertRowid;

    // Create notification preferences
    db.prepare(`
      INSERT INTO notification_preferences (user_id, email_alerts, in_app_alerts, sla_critical, anomalies, task_updates)
      VALUES (?, 1, 1, 1, 1, 1)
    `).run(newId);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "USER_CREATE",
      entity: "User",
      entityId: newId,
      details: `Created new user ${name} (${email}) with role '${role}'`,
      status: "Success"
    });

    res.status(201).json({ message: "User provisioned successfully", userId: newId });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// PUT /api/users/:id
router.put("/users/:id", authenticateToken, authorizeRoles("Operations Admin"), (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, campus_id, department, status, password } = req.body;

    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = [];
    const params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (role) { updates.push("role = ?"); params.push(role); }
    if (campus_id !== undefined) { updates.push("campus_id = ?"); params.push(campus_id); }
    if (department) { updates.push("department = ?"); params.push(department); }
    if (status) { updates.push("status = ?"); params.push(status); }
    if (password && password.trim()) {
      updates.push("password = ?");
      params.push(bcrypt.hashSync(password, 10));
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No update parameters provided" });
    }

    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "USER_UPDATE",
      entity: "User",
      entityId: id,
      details: `Updated user #${id} (${existing.email}): ${role ? 'role -> ' + role : ''} ${status ? 'status -> ' + status : ''}`,
      status: "Success"
    });

    res.json({ message: "User profile updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
});

// PUT /api/users/:id/status
router.put("/users/:id/status", authenticateToken, authorizeRoles("Operations Admin"), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
    }

    // Prevent deactivating own account
    if (Number(id) === req.user.userId) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "USER_STATUS_CHANGE",
      entity: "User",
      entityId: id,
      details: `Changed user #${id} status to '${status}'`,
      status: "Success"
    });

    res.json({ message: `User status changed to ${status}`, id, status });
  } catch (error) {
    res.status(500).json({ message: "Failed to modify user status" });
  }
});

module.exports = router;
