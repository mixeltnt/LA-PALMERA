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
    <div className="d-flex vh-100 vw-100 overflow-hidden bg-dark position-relative">
      <div className="d-none d-lg-flex flex-column h-100 bg-dark flex-shrink-0" style={{ width: "240px" }}>
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="sidebar-backdrop d-lg-none" onClick={closeSidebar}>
          <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <Sidebar onClose={closeSidebar} />
          </div>
        </div>
      )}

      <div className="d-flex flex-column flex-grow-1 h-100 overflow-hidden" style={{ minWidth: 0 }}>
        <Navbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="flex-grow-1 p-3 p-md-4 bg-light overflow-auto position-relative">
          <Outlet />
        </main>
      </div>

      {/* Asistente Virtual */}
      <AsistenteVirtual />
    </div>
  );
}

export default MainLayout;

