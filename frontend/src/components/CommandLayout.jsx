import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function CommandLayout({ children }) {
  const [selectedCampus, setSelectedCampus] = useState(
    localStorage.getItem("selectedCampus") || "All"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCampusChange = (campusId) => {
    setSelectedCampus(campusId);
    localStorage.setItem("selectedCampus", campusId);
    window.dispatchEvent(new CustomEvent("campusChanged", { detail: campusId }));
  };

  // Close sidebar on route change (mobile)
  const closeSidebar = () => setSidebarOpen(false);

  // Close sidebar on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="app-container">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      {/* Sidebar — fixed; gets .sidebar-open class on mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="main-wrapper">
        <Navbar
          selectedCampus={selectedCampus}
          onCampusChange={handleCampusChange}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
