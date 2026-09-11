import React from "react";
import { Navigate } from "react-router-dom";
import CommandLayout from "./components/CommandLayout";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization if specified
  if (allowedRoles.length > 0 && user.role !== "Operations Admin" && !allowedRoles.includes(user.role)) {
    return (
      <CommandLayout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "8px" }}>403 - Access Restricted</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Your assigned role (<strong>{user.role}</strong>) does not have authorization to access this operational screen.
          </p>
        </div>
      </CommandLayout>
    );
  }

  return <CommandLayout>{children}</CommandLayout>;
}