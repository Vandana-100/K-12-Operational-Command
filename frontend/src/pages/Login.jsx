import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { IconCheck, IconX } from "../components/Icons";
import { Modal } from "../components/CommonUI";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");

  const demoAccounts = [
    { role: "Operations Admin",   email: "admin@school.com",   redirect: "/dashboard",        desc: "Full Governance & Approvals" },
    { role: "Operations Manager", email: "manager@school.com", redirect: "/dashboard",        desc: "Live Queues & Tasks" },
    { role: "Operations Analyst", email: "analyst@school.com", redirect: "/forecast-capacity",desc: "Forecasts & Models" },
    { role: "Field Staff",        email: "staff@school.com",   redirect: "/tasks",            desc: "Frontline Assigned Tasks" },
  ];

  const handleQuickLogin = (demo) => {
    setEmail(demo.email);
    setPassword("admin123");
    executeLogin(demo.email, "admin123", demo.redirect);
  };

  const executeLogin = async (loginEmail, loginPass, preferredRedirect) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await axios.post("https://k-12-operational-command.onrender.com/api/auth/login", {
        email: loginEmail,
        password: loginPass,
      });
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setSuccessMessage(`Signed in as ${user.name}. Redirecting...`);
      setTimeout(() => {
        if (preferredRedirect) navigate(preferredRedirect);
        else if (user.role === "Field Staff") navigate("/tasks");
        else if (user.role === "Operations Analyst") navigate("/forecast-capacity");
        else navigate("/dashboard");
      }, 600);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) { setErrorMessage("Please enter both email and password."); return; }
    executeLogin(email, password);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await axios.post("https://k-12-operational-command.onrender.com/api/auth/forgot-password", { email: forgotEmail });
      setForgotStatus("Reset link sent. Check your inbox.");
      setTimeout(() => { setIsForgotModalOpen(false); setForgotStatus(""); }, 2500);
    } catch {
      setForgotStatus("Failed to send reset link. Please retry.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--bg-app)",
      padding: "24px",
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "28px 28px 20px",
          borderBottom: "1px solid var(--border)",
          textAlign: "center",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--accent)",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: "var(--radius)",
            fontWeight: 700,
            fontSize: "13px",
            marginBottom: "14px",
          }}>
            K12 Command Center
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
            Sign in
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: 0 }}>
            Apex Academy Predictive Operations
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "24px 28px" }}>
          {errorMessage && (
            <div className="badge-danger" style={{
              padding: "10px 12px", borderRadius: "var(--radius)", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8, fontSize: 13
            }}>
              <IconX size={14} /> {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="badge-success" style={{
              padding: "10px 12px", borderRadius: "var(--radius)", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8, fontSize: 13
            }}>
              <IconCheck size={14} /> {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: "52px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", color: "var(--text-tertiary)",
                    fontSize: 12, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex-between mb-4" style={{ fontSize: 13 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Demo Logins */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              color: "var(--text-tertiary)", letterSpacing: "0.5px",
              marginBottom: 10, textAlign: "center"
            }}>
              Quick Demo Access
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {demoAccounts.map(demo => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => handleQuickLogin(demo)}
                  className="btn btn-secondary"
                  style={{ textAlign: "left", padding: "8px 10px", height: "auto", display: "block" }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{demo.role}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>{demo.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: "var(--gray-50)",
          padding: "10px 24px",
          textAlign: "center",
          fontSize: 11,
          color: "var(--text-tertiary)",
          borderTop: "1px solid var(--border)",
        }}>
          Secured · TLS Encrypted · Audit Logged
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Password"
      >
        <form onSubmit={handleForgotPassword}>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
            Enter your email and we'll send a reset link to your administrator.
          </p>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@school.com"
              required
            />
          </div>
          {forgotStatus && (
            <div className="badge-success" style={{ padding: "10px 12px", borderRadius: "var(--radius)", fontSize: 13, marginBottom: 16 }}>
              {forgotStatus}
            </div>
          )}
          <div className="flex-between">
            <button type="button" className="btn btn-secondary" onClick={() => setIsForgotModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Send Reset Link</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}