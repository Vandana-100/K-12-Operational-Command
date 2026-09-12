const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. Authorization token is required."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Invalid token format."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session token. Please log in again."
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "User is not authenticated."
      });
    }

    // Operations Admin always has overarching access
    if (req.user.role === "Operations Admin" || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Role '${req.user.role}' lacks sufficient privileges for this action.`
    });
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET
};