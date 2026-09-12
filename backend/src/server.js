const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const anomalyRoutes = require("./routes/anomalyRoutes");
const taskRoutes = require("./routes/taskRoutes");
const preventiveActionRoutes = require("./routes/preventiveActionRoutes");
const scenarioRoutes = require("./routes/scenarioRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");
const auditRoutes = require("./routes/auditRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Request Logging & Parsing
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiter for Authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window
  message: { message: "Too many authentication requests, please try again later." }
});
app.use("/api/auth/login", authLimiter);

// API Route Registration
app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", workflowRoutes);
app.use("/api", predictionRoutes);
app.use("/api", anomalyRoutes);
app.use("/api", taskRoutes);
app.use("/api", preventiveActionRoutes);
app.use("/api", scenarioRoutes);
app.use("/api", reportRoutes);
app.use("/api", notificationRoutes);
app.use("/api", userRoutes);
app.use("/api", auditRoutes);
app.use("/api", settingsRoutes);
app.use("/api", studentRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "K-12 Predictive Operations Command Center Backend",
    version: "2.4.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "K-12 Predictive Operations Command Center API is running",
    documentation: "/api/health"
  });
});

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `API endpoint '${req.originalUrl}' not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error occurred",
    errorId: Date.now()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`K-12 Predictive Operations Command Center Backend`);
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);
});

module.exports = app;
