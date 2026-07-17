import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "bi-grid-fill" },
  { to: "/inventario", label: "Inventario", icon: "bi-boxes" },
  { to: "/productos", label: "Productos", icon: "bi-box-seam-fill" },
  { to: "/categorias", label: "Categorías", icon: "bi-tags-fill" },
  { to: "/ventas", label: "Ventas", icon: "bi-cart-fill" },
  { to: "/compras", label: "Compras", icon: "bi-truck" },
  { to: "/clientes", label: "Clientes", icon: "bi-people-fill" },
  { to: "/proveedores", label: "Proveedores", icon: "bi-person-badge" },
  { to: "/usuarios", label: "Usuarios", icon: "bi-person-fill-gear" },
  { to: "/reportes", label: "Reportes", icon: "bi-bar-chart-fill" },
  { to: "/configuracion", label: "Configuración", icon: "bi-gear-fill" },
];

function Sidebar() {
  return (
    <aside
      className="bg-dark text-white d-flex flex-column flex-shrink-0"
      style={{ width: "240px", height: "100vh", position: "sticky", top: 0 }}
    >
      <div className="p-3 border-bottom border-secondary">
        <div className="d-flex align-items-center gap-2">
          <img src="/favicon.svg" alt="Logo" width="32" height="32" />
          <span className="fw-bold fs-5">La Palmera</span>
        </div>
      </div>

      <div className="d-flex flex-column gap-1 p-2 flex-grow-1 overflow-auto">
        <small className="text-secondary px-2 pt-2 pb-1 fw-semibold">MENÚ</small>
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
