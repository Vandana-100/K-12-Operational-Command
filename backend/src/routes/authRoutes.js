const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const { authenticateToken, JWT_SECRET } = require("../middleware/authMiddleware");
const { logAudit } = require("../services/auditService");

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = db.prepare(`
      SELECT u.*, c.name as campus_name, c.code as campus_code
      FROM users u
      LEFT JOIN campuses c ON u.campus_id = c.id
      WHERE u.email = ?
    `).get(email.trim().toLowerCase());

    if (!user) {
      logAudit({
        userName: email,
        role: "Unknown",
        action: "LOGIN_FAILED",
        entity: "Auth",
        details: "User email not found",
        status: "Failed"
      });

      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Your account is deactivated. Contact Operations Admin."
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: "LOGIN_FAILED",
        entity: "Auth",
        details: "Invalid password attempt",
        status: "Failed"
      });

      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Update last_login
    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    const tokenPayload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      campusId: user.campus_id,
      campusName: user.campus_name || "All Campuses",
      department: user.department
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "8h" });

    logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: "LOGIN_SUCCESS",
      entity: "Auth",
      details: `User logged in successfully with role '${user.role}'`,
      status: "Success"
    });

    res.json({
      message: "Login successful",
      token,
      user: tokenPayload
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error during login" });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.campus_id, u.department, u.status, u.last_login,
             c.name as campus_name, c.code as campus_code
      FROM users u
      LEFT JOIN campuses c ON u.campus_id = c.id
      WHERE u.id = ?
    `).get(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  logAudit({
    userName: email,
    role: "User",
    action: "PASSWORD_RESET_REQUEST",
    entity: "Auth",
    details: `Password reset requested for ${email}`,
    status: "Success"
  });

  res.json({
    message: "If an account with that email exists, an operational password reset link has been dispatched."
  });
});

module.exports = router;