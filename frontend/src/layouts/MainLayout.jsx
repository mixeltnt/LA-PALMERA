import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div className="d-flex flex-column min-vh-100 app-shell">
      <Navbar />
      <div
        className="d-flex flex-grow-1"
        style={{ minHeight: "calc(100vh - 68px)" }}
      >
        <Sidebar />
        <main className="flex-grow-1 p-4 overflow-auto bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
