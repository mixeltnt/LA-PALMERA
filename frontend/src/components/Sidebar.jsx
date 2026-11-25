/**
 * ============================================================================
 * LA PALMERA POS — MENÚ LATERAL DE NAVEGACIÓN (SIDEBAR)
 * ============================================================================
 * Muestra el logotipo vectorial en alta definición de La Palmera, la versión del sistema (v32)
 * y la lista de accesos a los módulos con control de permisos por roles (admin, encargada, supervisor, cajero).
 */

import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LaPalmeraLogo from "./LaPalmeraLogo";
import { APP_VERSION } from "../constants/version";

/**
 * Definición de los enlaces del menú lateral y los roles con permiso de acceso
 */
const links = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-grid-fill", roles: ["admin", "encargada", "supervisor"] },
  { to: "/inventario", label: "Inventario", icon: "bi-boxes", roles: ["admin", "encargada", "supervisor"] },
  { to: "/productos", label: "Productos", icon: "bi-box-seam-fill", roles: ["admin", "encargada", "supervisor"] },
  { to: "/categorias", label: "Categorías", icon: "bi-tags-fill", roles: ["admin", "encargada", "supervisor"] },
  { to: "/ventas", label: "Ventas", icon: "bi-cart-fill", roles: ["admin", "encargada", "vendedor", "cajero", "supervisor"] },
  { to: "/caja", label: "Caja / Turnos", icon: "bi-safe2-fill", roles: ["admin", "encargada", "vendedor", "cajero", "supervisor"] },
  { to: "/ventas/historial", label: "Historial Ventas", icon: "bi-clock-history", roles: ["admin", "encargada", "supervisor"] },
  { to: "/compras", label: "Compras", icon: "bi-truck", roles: ["admin", "encargada", "supervisor"] },
  { to: "/clientes", label: "Clientes (Fiados)", icon: "bi-people-fill", roles: ["admin", "encargada", "supervisor"] },
  { to: "/proveedores", label: "Proveedores", icon: "bi-person-badge", roles: ["admin", "encargada", "supervisor"] },
  { to: "/usuarios", label: "Usuarios", icon: "bi-person-fill-gear", roles: ["admin"] },
  { to: "/reportes", label: "Reportes", icon: "bi-bar-chart-fill", roles: ["admin", "encargada", "supervisor"] },
  { to: "/configuracion", label: "Configuración", icon: "bi-gear-fill", roles: ["admin"] },
];

function Sidebar({ onClose }) {
  const { user } = useAuth();
  const rol = user?.rol;

  // Filtrar los módulos según el rol del usuario conectado
  const linksVisibles = links.filter((item) => !item.roles || item.roles.includes(rol));

  return (
    <aside
      className="lp-sidebar d-flex flex-column flex-shrink-0 h-100 shadow-sm"
      style={{ width: "240px" }}
    >
      {/* Cabecera del Sidebar con Logotipo e Insignia de Versión */}
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between" style={{ borderColor: "var(--lp-border)" }}>
        <div className="d-flex align-items-center gap-2">
          <LaPalmeraLogo
            variant="mark"
            style={{ width: 42, height: 42, flexShrink: 0, filter: "drop-shadow(0 2px 8px rgba(16,185,129,0.3))" }}
          />
          <div>
            <span className="fw-bold fs-5 d-block line-height-1" style={{ color: "var(--lp-text)" }}>
              La Palmera
            </span>
            <span
              className="badge px-2 py-0 fw-bold"
              style={{
                fontSize: "0.68rem",
                backgroundColor: "var(--lp-primary-dark, #047857)",
                color: "#ffffff",
                border: "1px solid var(--lp-primary, #10b981)",
              }}
            >
              {APP_VERSION}
            </span>
          </div>
        </div>

        {/* Botón cerrar para móviles */}
        {onClose && (
          <button
            type="button"
            className="btn-close d-lg-none"
            aria-label="Cerrar menú"
            onClick={onClose}
          ></button>
        )}
      </div>

      {/* Lista de Navegación */}
      <div className="d-flex flex-column gap-1 p-2 flex-grow-1 overflow-auto">
        <small className="px-3 pt-2 pb-1 fw-bold" style={{ color: "var(--lp-text-muted)", fontSize: "0.72rem", letterSpacing: "0.5px" }}>
          MENÚ
        </small>
        {linksVisibles.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-nav-link d-flex align-items-center gap-2 text-decoration-none px-3 py-2 rounded-3 ${
                isActive ? "active" : ""
              }`
            }
          >
            <i className={`bi ${item.icon} fs-6`}></i>
            <span className="small fw-semibold">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Pie del Sidebar con Créditos del Desarrollador */}
      <div className="p-3 border-top" style={{ borderColor: "var(--lp-border)" }}>
        <p className="small mb-1 fw-semibold" style={{ color: "var(--lp-text-secondary)", fontSize: "0.78rem" }}>
          © 2026 La Palmera • {APP_VERSION}
        </p>
        <p className="mb-0" style={{ color: "var(--lp-text-muted)", fontSize: "0.72rem" }}>
          Desarrollado por{" "}
          <span className="fw-bold" style={{ color: "var(--lp-primary-light, var(--lp-primary, #10b981))" }}>
            MixelTNT
          </span>
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
