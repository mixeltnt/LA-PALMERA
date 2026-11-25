/**
 * ============================================================================
 * LA PALMERA POS — BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR)
 * ============================================================================
 * Proporciona el estado de conexión local (DesktopStatusBadge), información
 * del usuario logueado, selector de tema (claro/oscuro) y cierre de sesión.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import DesktopStatusBadge from "./DesktopStatusBadge";
import { toggleFullscreen } from "../utils/windowControls";

function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estado del tema de la aplicación (detectando todos los temas oscuros de v32)
  const isDarkTheme = (t) => ["dark", "midnight", "sapphire", "amethyst", "amber"].includes(t);
  const [theme, setTheme] = useState(() => {
    const current =
      document.documentElement.getAttribute("data-theme") ||
      localStorage.getItem("lapalmera_theme") ||
      localStorage.getItem("lapalmera-theme") ||
      "dark";
    return current;
  });

  /**
   * Alterna entre modo claro y oscuro persistiendo la preferencia en localStorage
   */
  const toggleTheme = () => {
    const currentlyDark = isDarkTheme(theme);
    const next = currentlyDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lapalmera_theme", next);
      localStorage.setItem("lapalmera-theme", next);
    } catch {
      // El tema se aplica para la sesión actual si localStorage no está disponible
    }
  };

  /**
   * Cierra la sesión activa y redirige al login
   */
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Iniciales del usuario para el avatar
  const initials =
    user?.nombre
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";

  return (
    <nav className="navbar navbar-expand lp-navbar px-3 px-md-4 shadow-sm">
      <div className="container-fluid px-0 d-flex align-items-center justify-content-between flex-nowrap">
        {/* Título de la marca en vista móvil y botón menú */}
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-navbar-action d-lg-none p-1 px-2 border-0"
            style={{ minWidth: 36, minHeight: 36 }}
            onClick={onToggleSidebar}
            aria-label="Abrir menú"
          >
            <i className="bi bi-list fs-4"></i>
          </button>

          <span className="navbar-brand fw-bold mb-0 d-lg-none text-truncate" style={{ fontSize: "1.05rem" }}>
            🌴 La Palmera
          </span>
        </div>

        {/* Sección Derecha: Estado, Usuario, Tema y Logout */}
        <div className="d-flex align-items-center gap-2 ms-auto flex-nowrap">
          {/* Indicador de Estado Local / SQLite */}
          <DesktopStatusBadge />

          {/* Información del Usuario */}
          <div className="text-end d-none d-md-block px-1">
            <div className="small fw-bold" style={{ color: "var(--lp-text)", lineHeight: 1.2 }}>
              {user?.nombre || "Administrador"}
            </div>
            <div className="small text-capitalize" style={{ color: "var(--lp-text-secondary)", fontSize: "0.75rem" }}>
              {user?.rol || "admin"}
            </div>
          </div>

          {/* Botón Alternar Pantalla Completa (F11) - Solo visible en Escritorio */}
          <button
            className="btn btn-navbar-action d-none d-lg-inline-flex align-items-center justify-content-center p-1"
            style={{ width: 36, height: 36 }}
            onClick={toggleFullscreen}
            title="Pantalla Completa (F11)"
            aria-label="Alternar Pantalla Completa"
          >
            <i className="bi bi-arrows-fullscreen"></i>
          </button>

          {/* Selector de Tema Claro / Oscuro */}
          <button
            className="btn btn-navbar-action d-inline-flex align-items-center justify-content-center p-1"
            style={{ width: 36, height: 36 }}
            onClick={toggleTheme}
            title={isDarkTheme(theme) ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Tema"
          >
            <i className={`bi ${isDarkTheme(theme) ? "bi-sun-fill text-warning" : "bi-moon-stars-fill text-primary"} fs-6`}></i>
          </button>

          {/* Avatar con Iniciales */}
          <div
            className="d-flex align-items-center justify-content-center rounded-circle fw-bold shadow-sm"
            style={{
              width: 34,
              height: 34,
              fontSize: 13,
              flexShrink: 0,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              boxShadow: "0 0 10px rgba(16, 185, 129, 0.35)",
            }}
            title={user?.nombre}
          >
            {initials}
          </div>

          {/* Botón Salir / Cerrar Sesión */}
          <button
            className="btn btn-navbar-action d-inline-flex align-items-center justify-content-center p-1 ms-1"
            style={{ width: 36, height: 36 }}
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <i className="bi bi-box-arrow-right fs-6 text-danger"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
