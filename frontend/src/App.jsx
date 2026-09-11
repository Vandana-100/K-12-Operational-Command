import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LiveWorkflowQueues from "./pages/LiveWorkflowQueues";
import ForecastCapacityAnalysis from "./pages/ForecastCapacityAnalysis";
import TaskScenarioPlanning from "./pages/TaskScenarioPlanning";
import DemandPredictions from "./pages/DemandPredictions";
import AnomalyRiskExplanations from "./pages/AnomalyRiskExplanations";
import PreventiveActionsTracking from "./pages/PreventiveActionsTracking";
import ReportsAnalytics from "./pages/ReportsAnalytics";
import NotificationsCenter from "./pages/NotificationsCenter";
import UserRoleManagement from "./pages/UserRoleManagement";
import AuditSettings from "./pages/AuditSettings";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* 1. Operations Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* 2. Live Workflow Queues (8 Domains) */}
        <Route
          path="/workflows"
          element={
            <ProtectedRoute>
              <LiveWorkflowQueues />
            </ProtectedRoute>
          }
        />

        {/* 3. Forecast, Capacity and Risk Analysis */}
        <Route
          path="/forecast-capacity"
          element={
            <ProtectedRoute>
              <ForecastCapacityAnalysis />
            </ProtectedRoute>
          }
        />

        {/* 4. Task Assignment, Escalation and Scenario Planning */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskScenarioPlanning />
            </ProtectedRoute>
          }
        />

        {/* 5. Demand & Workload Predictions */}
        <Route
          path="/predictions"
          element={
            <ProtectedRoute>
              <DemandPredictions />
            </ProtectedRoute>
          }
        />

        {/* 6. Anomaly and Risk Explanations */}
        <Route
          path="/anomalies"
          element={
            <ProtectedRoute>
              <AnomalyRiskExplanations />
            </ProtectedRoute>
          }
        />

        {/* 7. Preventive Actions and Outcome Tracking */}
        <Route
          path="/preventive-actions"
          element={
            <ProtectedRoute>
              <PreventiveActionsTracking />
            </ProtectedRoute>
          }
        />

        {/* 8. Reports and Analytics */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsAnalytics />
            </ProtectedRoute>
          }
        />

        {/* 9. Notifications Center */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsCenter />
            </ProtectedRoute>
          }
        />

        {/* 10. User and Role Management (Admin only) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["Operations Admin"]}>
              <UserRoleManagement />
            </ProtectedRoute>
          }
        />

        {/* 11. Audit Logs and System Settings */}
        <Route
          path="/audit-settings"
          element={
            <ProtectedRoute allowedRoles={["Operations Admin", "Operations Manager", "Operations Analyst"]}>
              <AuditSettings />
            </ProtectedRoute>
          }
        />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}