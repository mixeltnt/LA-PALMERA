import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
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
    <div className="d-flex min-vh-100">
      <div className="d-none d-lg-block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="sidebar-backdrop d-lg-none" onClick={closeSidebar}>
          <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <Sidebar onClose={closeSidebar} />
          </div>
        </div>
      )}

      <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
        <Navbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="flex-grow-1 p-2 p-md-4 bg-light overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
