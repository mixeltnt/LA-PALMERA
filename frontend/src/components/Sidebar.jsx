/**
 * ============================================================================
 * LA PALMERA POS — MENÚ LATERAL DE NAVEGACIÓN (SIDEBAR)
 * ============================================================================
 * Muestra el logotipo vectorial en alta definición de La Palmera, la versión del sistema
 * y la lista de accesos a los módulos con control de permisos por roles (admin, encargada, cajero).
 */

import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LaPalmeraLogo from "./LaPalmeraLogo";

/**
 * Definición de los enlaces del menú lateral y los roles con permiso de acceso
 */
const links = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-grid-fill", roles: ["admin", "encargada"] },
  { to: "/inventario", label: "Inventario", icon: "bi-boxes", roles: ["admin", "encargada"] },
  { to: "/productos", label: "Productos", icon: "bi-box-seam-fill", roles: ["admin", "encargada"] },
  { to: "/categorias", label: "Categorías", icon: "bi-tags-fill", roles: ["admin", "encargada"] },
  { to: "/ventas", label: "Ventas", icon: "bi-cart-fill", roles: ["admin", "encargada", "vendedor", "cajero"] },
  { to: "/ventas/historial", label: "Historial Ventas", icon: "bi-clock-history", roles: ["admin", "encargada"] },
  { to: "/compras", label: "Compras", icon: "bi-truck", roles: ["admin", "encargada"] },
  { to: "/clientes", label: "Clientes (Fiados)", icon: "bi-people-fill", roles: ["admin", "encargada"] },
  { to: "/proveedores", label: "Proveedores", icon: "bi-person-badge", roles: ["admin", "encargada"] },
  { to: "/usuarios", label: "Usuarios", icon: "bi-person-fill-gear", roles: ["admin"] },
  { to: "/reportes", label: "Reportes", icon: "bi-bar-chart-fill", roles: ["admin", "encargada"] },
  { to: "/configuracion", label: "Configuración", icon: "bi-gear-fill", roles: ["admin"] },
];

function Sidebar({ onClose }) {
  const { user } = useAuth();
  const rol = user?.rol;

  // Filtrar los módulos según el rol del usuario conectado
  const linksVisibles = links.filter((item) => !item.roles || item.roles.includes(rol));

  return (
    <aside
      className="bg-dark text-white d-flex flex-column flex-shrink-0 h-100"
      style={{ width: "240px" }}
    >
      {/* Cabecera del Sidebar con Logotipo e Insignia de Versión */}
      <div className="p-3 border-bottom border-secondary d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <LaPalmeraLogo
            variant="mark"
            style={{ width: 44, height: 44, flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
          />
          <div>
            <span className="fw-bold fs-5 d-block line-height-1">La Palmera</span>
            <span
              className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-1 py-0"
              style={{ fontSize: "0.68rem" }}
            >
              v22
            </span>
          </div>
        </div>

        {/* Botón cerrar para móviles */}
        {onClose && (
          <button
            type="button"
            className="btn-close btn-close-white d-lg-none"
            aria-label="Cerrar menú"
            onClick={onClose}
          ></button>
        )}
      </div>

      {/* Lista de Navegación */}
      <div className="d-flex flex-column gap-1 p-2 flex-grow-1 overflow-auto">
        <small className="text-secondary px-2 pt-2 pb-1 fw-semibold">MENÚ</small>
        {linksVisibles.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `d-flex align-items-center gap-2 text-decoration-none px-3 py-2 rounded ${
                isActive
                  ? "bg-success text-white"
                  : "text-white-50 hover-bg"
              }`
            }
          >
            <i className={`bi ${item.icon}`}></i>
            <span className="small">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Pie del Sidebar con Créditos del Desarrollador */}
      <div className="p-3 border-top border-secondary">
        <p className="small text-white-50 mb-1 fw-semibold">© 2026 La Palmera • v22</p>
        <p className="text-muted mb-0" style={{ fontSize: "0.72rem" }}>
          Desarrollado por <span className="text-success fw-semibold">MixelTNT</span>
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;