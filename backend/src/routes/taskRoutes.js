const express = require("express");
const db = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// GET /api/tasks
router.get("/tasks", authenticateToken, (req, res) => {
  try {
    const { domain, priority, status, search, assigned_to } = req.query;

    let query = `
      SELECT t.*, c.name as campus_name, c.code as campus_code
      FROM tasks t
      LEFT JOIN campuses c ON t.campus_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC: Field staff only see their assigned tasks
    if (req.user.role === "Field Staff") {
      query += " AND (t.assigned_user_id = ? OR t.assigned_to LIKE ?)";
      params.push(req.user.userId, `%${req.user.name}%`);
    }

    if (domain && domain !== "All") {
      query += " AND t.domain = ?";
      params.push(domain);
    }
    if (priority && priority !== "All") {
      query += " AND t.priority = ?";
      params.push(priority);
    }
    if (status && status !== "All") {
      query += " AND t.status = ?";
      params.push(status);
    }
    if (assigned_to && assigned_to !== "All") {
      query += " AND t.assigned_to = ?";
      params.push(assigned_to);
    }
    if (search) {
      query += " AND (t.title LIKE ? OR t.notes LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, t.id DESC";

    const tasks = db.prepare(query).all(...params);

    // Kanban Summary
    const summary = {
      total: tasks.length,
      open: tasks.filter(t => t.status === "Open").length,
      inProgress: tasks.filter(t => t.status === "In Progress").length,
      completed: tasks.filter(t => t.status === "Completed").length,
      critical: tasks.filter(t => t.priority === "Critical" || t.priority === "High").length
    };

    res.json({ tasks, summary });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /api/tasks/timeline
// Global action timeline of all task operations taken
router.get("/tasks/timeline", authenticateToken, (req, res) => {
  try {
    const timeline = db.prepare(`
      SELECT th.*, t.title as task_title, t.domain as task_domain
      FROM task_history th
      JOIN tasks t ON th.task_id = t.id
      ORDER BY th.created_at DESC
      LIMIT 30
    `).all();

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch task timeline" });
  }
});

// GET /api/tasks/:id/history
router.get("/tasks/:id/history", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const history = db.prepare("SELECT * FROM task_history WHERE task_id = ? ORDER BY created_at DESC").all(id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch task history" });
  }
});

// POST /api/tasks
router.post("/tasks", authenticateToken, (req, res) => {
  try {
    const { title, domain, priority, assigned_to, assigned_user_id, due_date, campus_id, notes } = req.body;

    if (!title || !domain) {
      return res.status(400).json({ message: "Title and domain are required" });
    }

    const insert = db.prepare(`
      INSERT INTO tasks (title, domain, priority, status, assigned_to, assigned_user_id, due_date, campus_id, notes)
      VALUES (?, ?, ?, 'Open', ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      title,
      domain,
      priority || "Medium",
      assigned_to || req.user.name,
      assigned_user_id || req.user.userId,
      due_date || null,
      campus_id || req.user.campusId || 1,
      notes || ""
    );

    const newId = result.lastInsertRowid;

    // Record creation history
    db.prepare(`
      INSERT INTO task_history (task_id, actor_name, action, old_value, new_value, reason)
      VALUES (?, ?, 'Task Created', 'None', 'Open', 'Initial task provisioning')
    `).run(newId, req.user.name);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "TASK_CREATE",
      entity: "Task",
      entityId: newId,
      details: `Created task #${newId}: ${title} (${domain})`,
      status: "Success"
    });

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(newId);
    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// PUT /api/tasks/:id
router.put("/tasks/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, priority, notes, reason } = req.body;

    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (assigned_to) {
      updates.push("assigned_to = ?");
      params.push(assigned_to);
    }
    if (priority) {
      updates.push("priority = ?");
      params.push(priority);
    }
    if (notes) {
      updates.push("notes = ?");
      params.push(notes);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    // Record timeline event
    db.prepare(`
      INSERT INTO task_history (task_id, actor_name, action, old_value, new_value, reason)
      VALUES (?, ?, 'Status/Assignment Update', ?, ?, ?)
    `).run(
      id,
      req.user.name,
      `${existing.status} (${existing.assigned_to})`,
      `${status || existing.status} (${assigned_to || existing.assigned_to})`,
      reason || "Operational update"
    );

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "TASK_UPDATE",
      entity: "Task",
      entityId: id,
      details: `Updated task #${id}: ${status ? "status -> " + status : ""} ${reason || ""}`,
      status: "Success"
    });

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    res.json({ message: "Task updated successfully", task });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// PUT /api/tasks/:id/escalate
router.put("/tasks/:id/escalate", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    db.prepare(`
      UPDATE tasks
      SET priority = 'Critical', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    db.prepare(`
      INSERT INTO task_history (task_id, actor_name, action, old_value, new_value, reason)
      VALUES (?, ?, 'Escalation', ?, 'Critical', ?)
    `).run(id, req.user.name, existing.priority, reason || "Task escalated due to service level risk.");

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "TASK_ESCALATE",
      entity: "Task",
      entityId: id,
      details: `Escalated task #${id} to Critical: ${reason || "Service risk warning"}`,
      status: "Success"
    });

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    res.json({ message: "Task escalated successfully to Critical", task });
  } catch (error) {
    res.status(500).json({ message: "Failed to escalate task" });
  }
});

module.exports = router;
