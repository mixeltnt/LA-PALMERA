import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="d-flex min-vh-100">
      <div className={`d-none d-lg-flex`}>
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-50 z-1 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={() => setSidebarOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-100">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-grow-1 p-4 bg-light overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
