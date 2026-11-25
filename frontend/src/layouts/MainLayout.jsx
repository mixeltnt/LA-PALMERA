import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AsistenteVirtual from "../components/Asistente/AsistenteVirtual";
import { Outlet } from "react-router-dom";

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="d-flex vh-100 vw-100 overflow-hidden lp-layout-root position-relative">
      <div className="d-none d-lg-flex flex-column h-100 flex-shrink-0" style={{ width: "240px" }}>
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="sidebar-backdrop d-lg-none" onClick={closeSidebar}>
          <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <Sidebar onClose={closeSidebar} />
          </div>
        </div>
      )}

      <div className="d-flex flex-column flex-grow-1 h-100 overflow-hidden w-100" style={{ minWidth: 0 }}>
        <Navbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="flex-grow-1 p-3 p-md-4 lp-main-area overflow-auto position-relative w-100 h-100">
          <div style={{ paddingBottom: "88px" }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Asistente Virtual */}
      <AsistenteVirtual />
    </div>
  );
}

export default MainLayout;

