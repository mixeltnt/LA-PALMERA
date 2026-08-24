import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-grid-fill", roles: ["admin", "encargada"] },
  { to: "/inventario", label: "Inventario", icon: "bi-boxes", roles: ["admin", "encargada"] },
  { to: "/productos", label: "Productos", icon: "bi-box-seam-fill", roles: ["admin", "encargada"] },
  { to: "/categorias", label: "Categorías", icon: "bi-tags-fill", roles: ["admin", "encargada"] },
  { to: "/ventas", label: "Ventas", icon: "bi-cart-fill", roles: ["admin", "encargada", "vendedor"] },
  { to: "/ventas/historial", label: "Historial Ventas", icon: "bi-clock-history", roles: ["admin", "encargada"] },
  { to: "/compras", label: "Compras", icon: "bi-truck", roles: ["admin", "encargada"] },
  { to: "/clientes", label: "Clientes", icon: "bi-people-fill", roles: ["admin", "encargada"] },
  { to: "/proveedores", label: "Proveedores", icon: "bi-person-badge", roles: ["admin", "encargada"] },
  { to: "/usuarios", label: "Usuarios", icon: "bi-person-fill-gear", roles: ["admin"] },
  { to: "/reportes", label: "Reportes", icon: "bi-bar-chart-fill", roles: ["admin", "encargada"] },
  { to: "/configuracion", label: "Configuración", icon: "bi-gear-fill", roles: ["admin"] },
];

function Sidebar({ onClose }) {
  const { user } = useAuth();
  const rol = user?.rol;
  const linksVisibles = links.filter((item) => !item.roles || item.roles.includes(rol));

  return (
    <aside
      className="bg-dark text-white d-flex flex-column flex-shrink-0"
      style={{ width: "240px", height: "100vh", position: "sticky", top: 0 }}
    >
      <div className="p-3 border-bottom border-secondary d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <img src="/favicon.svg" alt="Logo" width="32" height="32" />
          <span className="fw-bold fs-5">La Palmera</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="btn-close btn-close-white d-lg-none"
            aria-label="Cerrar menú"
            onClick={onClose}
          ></button>
        )}
      </div>

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

      <div className="p-3 border-top border-secondary">
        <p className="small text-secondary mb-0">© 2026 La Palmera</p>
      </div>
    </aside>
  );
}

export default Sidebar;