const express = require("express");
const db = require("../db/database");
const { authenticateToken } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// GET /api/workflows
router.get("/workflows", authenticateToken, (req, res) => {
  try {
    const { domain, priority, sla_risk, status, campus_id, search } = req.query;

    let query = `
      SELECT w.*, c.name as campus_name, c.code as campus_code
      FROM workflow_queues w
      LEFT JOIN campuses c ON w.campus_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC: Field staff only see assigned items or support/attendance domains
    if (req.user.role === "Field Staff") {
      query += " AND (w.owner_id = ? OR w.domain IN ('Attendance', 'Support Intervention', 'Teaching'))";
      params.push(req.user.userId);
    }

    if (domain && domain !== "All") {
      query += " AND w.domain = ?";
      params.push(domain);
    }

    if (priority && priority !== "All") {
      query += " AND w.priority = ?";
      params.push(priority);
    }

    if (sla_risk && sla_risk !== "All") {
      query += " AND w.sla_risk = ?";
      params.push(sla_risk);
    }

    if (status && status !== "All") {
      query += " AND w.status = ?";
      params.push(status);
    }

    if (campus_id && campus_id !== "All") {
      query += " AND w.campus_id = ?";
      params.push(campus_id);
    }

    if (search) {
      query += " AND (w.title LIKE ? OR w.description LIKE ? OR w.owner_name LIKE ?)";
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    query += " ORDER BY CASE w.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, w.id DESC";

    const workflows = db.prepare(query).all(...params);

    // Summary counts by domain and status
    const domainCounts = db.prepare(`
      SELECT domain, COUNT(*) as count,
             SUM(CASE WHEN sla_risk IN ('At Risk', 'Breached') THEN 1 ELSE 0 END) as at_risk_count
      FROM workflow_queues
      GROUP BY domain
    `).all();

    res.json({
      workflows,
      domainCounts,
      totalCount: workflows.length
    });
  } catch (error) {
    console.error("Workflow queues error:", error);
    res.status(500).json({ message: "Failed to fetch workflow queues" });
  }
});

// GET /api/workflows/:id
router.get("/workflows/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare(`
      SELECT w.*, c.name as campus_name, c.code as campus_code
      FROM workflow_queues w
      LEFT JOIN campuses c ON w.campus_id = c.id
      WHERE w.id = ?
    `).get(id);

    if (!item) {
      return res.status(404).json({ message: "Workflow item not found" });
    }

    const history = db.prepare(`
      SELECT * FROM workflow_history
      WHERE workflow_id = ?
      ORDER BY created_at DESC
    `).all(id);

    res.json({ item, history });
  } catch (error) {
    res.status(500).json({ message: "Failed to load workflow details" });
  }
});

// POST /api/workflows
router.post("/workflows", authenticateToken, (req, res) => {
  try {
    const { domain, title, description, priority, owner_name, owner_id, campus_id, due_time, sla_risk, linked_entity_type, linked_entity_id } = req.body;

    if (!domain || !title) {
      return res.status(400).json({ message: "Domain and title are required" });
    }

    const insert = db.prepare(`
      INSERT INTO workflow_queues (domain, title, description, priority, status, owner_id, owner_name, campus_id, due_time, sla_risk, linked_entity_type, linked_entity_id)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      domain,
      title,
      description || "",
      priority || "Medium",
      owner_id || req.user.userId,
      owner_name || req.user.name,
      campus_id || req.user.campusId || 1,
      due_time || "Within 24h",
      sla_risk || "On Track",
      linked_entity_type || null,
      linked_entity_id || null
    );

    const newId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO workflow_history (workflow_id, user_name, action, notes)
      VALUES (?, ?, 'Created', 'Item entered operational queue manually')
    `).run(newId, req.user.name);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "WORKFLOW_CREATE",
      entity: "WorkflowQueue",
      entityId: newId,
      details: `Created workflow queue item in domain '${domain}': ${title}`,
      status: "Success"
    });

    const item = db.prepare("SELECT * FROM workflow_queues WHERE id = ?").get(newId);
    res.status(201).json({ message: "Workflow queue item created", item });
  } catch (error) {
    console.error("Create workflow error:", error);
    res.status(500).json({ message: "Failed to create workflow item" });
  }
});

// PUT /api/workflows/:id
router.put("/workflows/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status, owner_name, owner_id, priority, sla_risk, notes } = req.body;

    const existing = db.prepare("SELECT * FROM workflow_queues WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ message: "Workflow item not found" });
    }

    const updateFields = [];
    const params = [];

    if (status) {
      updateFields.push("status = ?");
      params.push(status);
    }
    if (owner_name) {
      updateFields.push("owner_name = ?");
      params.push(owner_name);
    }
    if (owner_id) {
      updateFields.push("owner_id = ?");
      params.push(owner_id);
    }
    if (priority) {
      updateFields.push("priority = ?");
      params.push(priority);
    }
    if (sla_risk) {
      updateFields.push("sla_risk = ?");
      params.push(sla_risk);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    db.prepare(`
      UPDATE workflow_queues
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `).run(...params);

    // Record activity history
    db.prepare(`
      INSERT INTO workflow_history (workflow_id, user_name, action, notes)
      VALUES (?, ?, 'Updated', ?)
    `).run(id, req.user.name, notes || `Status changed to ${status || existing.status}`);

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "WORKFLOW_UPDATE",
      entity: "WorkflowQueue",
      entityId: id,
      details: `Updated item #${id}: ${status ? "status -> " + status : ""} ${notes || ""}`,
      status: "Success"
    });

    const updated = db.prepare("SELECT * FROM workflow_queues WHERE id = ?").get(id);
    res.json({ message: "Workflow updated successfully", item: updated });
  } catch (error) {
    console.error("Update workflow error:", error);
    res.status(500).json({ message: "Failed to update workflow item" });
  }
});

// PUT /api/workflows/:id/escalate
router.put("/workflows/:id/escalate", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = db.prepare("SELECT * FROM workflow_queues WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ message: "Workflow item not found" });
    }

    db.prepare(`
      UPDATE workflow_queues
      SET priority = 'Critical', sla_risk = 'Breached', status = 'Escalated', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    db.prepare(`
      INSERT INTO workflow_history (workflow_id, user_name, action, notes)
      VALUES (?, ?, 'Escalated', ?)
    `).run(id, req.user.name, reason || "Priority escalated to Critical due to imminent SLA failure.");

    logAudit({
      userId: req.user.userId,
      userName: req.user.name,
      role: req.user.role,
      action: "WORKFLOW_ESCALATE",
      entity: "WorkflowQueue",
      entityId: id,
      details: `Escalated item #${id} (${existing.domain}): ${reason || "SLA breach warning"}`,
      status: "Success"
    });

    const updated = db.prepare("SELECT * FROM workflow_queues WHERE id = ?").get(id);
    res.json({ message: "Workflow item escalated to Critical", item: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to escalate workflow item" });
  }
});

module.exports = router;
