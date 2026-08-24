import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lapalmera-theme", next);
    } catch {
      // Almacenamiento no disponible: el tema se aplica solo en esta sesión.
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user?.nombre
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AD";

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success px-3 px-md-4 shadow-sm" style={{ minHeight: 60 }}>
      <div className="container-fluid px-0">
        <button className="btn btn-outline-light d-lg-none me-2" style={{ minWidth: 44, minHeight: 44 }} onClick={onToggleSidebar} aria-label="Abrir menú">
          <i className="bi bi-list fs-5"></i>
        </button>

        <span className="navbar-brand fw-semibold d-lg-none" style={{ fontSize: "1.05rem" }}>La Palmera</span>

        <div className="d-flex align-items-center gap-2 gap-md-3 ms-auto">
          <div className="text-end d-none d-md-block">
            <div className="text-white small fw-semibold">{user?.nombre || "Administrador"}</div>
            <div className="text-white-50 small text-capitalize">{user?.rol || "admin"}</div>
          </div>

          <button
            className="btn btn-outline-light"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={toggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          >
            <i className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon"}`}></i>
          </button>

          <div
            className="d-flex align-items-center justify-content-center rounded-circle bg-white text-success fw-bold"
            style={{ width: 38, height: 38, fontSize: 14 }}
            title={user?.nombre}
          >
            {initials}
          </div>

          <button className="btn btn-outline-light" style={{ minWidth: 44, minHeight: 44 }} onClick={handleLogout} title="Cerrar sesión">
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
