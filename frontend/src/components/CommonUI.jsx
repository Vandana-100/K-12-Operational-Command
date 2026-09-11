import React from "react";
import { IconX } from "./Icons";

export const Badge = ({ children, variant = "neutral", className = "" }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export const DomainBadge = ({ domain }) => {
  return (
    <span className="badge badge-domain">
      {domain}
    </span>
  );
};

export const SlaBadge = ({ risk }) => {
  const riskClass = risk === "Breached" ? "badge-sla-breached" : risk === "At Risk" ? "badge-sla-atrisk" : "badge-sla-ontrack";
  return (
    <span className={`badge ${riskClass}`}>
      {risk === "Breached" ? "● Breached" : risk === "At Risk" ? "▲ At Risk" : "✓ On Track"}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const variant = priority === "Critical" ? "danger" : priority === "High" ? "warning" : priority === "Medium" ? "info" : "neutral";
  return (
    <span className={`badge badge-${variant}`}>
      {priority}
    </span>
  );
};

export const Card = ({ title, subtitle, actions, children, className = "" }) => {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="card-title">{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Drawer = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="card-title">{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const LoadingSpinner = ({ message = "Loading data..." }) => {
  return (
    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-tertiary)" }}>
      <div style={{
        display: "inline-block",
        width: "32px",
        height: "32px",
        border: "2px solid var(--border)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
        marginBottom: "12px"
      }} />
      <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export const EmptyState = ({ title = "No records found", message = "No matching records for the selected filters.", action }) => {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "var(--radius-md)", border: "1px dashed var(--border)" }}>
      <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>{title}</p>
      <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: action ? "16px" : "0" }}>{message}</p>
      {action}
    </div>
  );
};

export const AlertBanner = ({ type = "warning", message, action }) => {
  return (
    <div className={`badge-${type}`} style={{ padding: "11px 14px", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", fontWeight: "normal" }}>
      <span style={{ fontSize: "13px" }}>{message}</span>
      {action}
    </div>
  );
};
