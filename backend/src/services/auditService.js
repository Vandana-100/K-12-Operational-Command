const db = require("../db/database");

/**
 * Centralized audit logger.
 * Writes immutable audit trail records for security and compliance.
 */
function logAudit({
  userId = null,
  userName = "System",
  role = "System",
  action,
  entity,
  entityId = null,
  details = "",
  ipAddress = "127.0.0.1",
  status = "Success"
}) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id,
        user_name,
        role,
        action,
        entity,
        entity_id,
        details,
        ip_address,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      userName,
      role,
      action,
      entity,
      entityId ? String(entityId) : null,
      typeof details === "object" ? JSON.stringify(details) : String(details),
      ipAddress,
      status
    );
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

module.exports = {
  logAudit
};
