import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/productos", label: "Productos", icon: "📦" },
  { to: "/inventario", label: "Inventario", icon: "🗂️" },
  { to: "/ventas", label: "Ventas", icon: "🛒" },
  { to: "/caja", label: "Caja", icon: "💵" },
  { to: "/reportes", label: "Reportes", icon: "📈" },
  { to: "/configuracion", label: "Configuración", icon: "⚙️" },
];

function Sidebar() {
  return (
    <aside
      className="bg-dark text-white d-flex flex-column p-3"
      style={{ width: "260px", minHeight: "100vh" }}
    >
      <div className="mb-4">
        <h6 className="text-success mb-3">Menú principal</h6>
      </div>
      <div className="d-flex flex-column gap-2">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `d-flex align-items-center gap-2 text-decoration-none px-3 py-2 rounded ${
                isActive ? "bg-success text-white" : "text-white-50"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="mt-auto pt-4 border-top border-secondary text-white-50">
        <p className="small mb-1">Versión 1.0</p>
        <p className="small mb-0">Soporte La Palmera</p>
      </div>
    </aside>
  );

export default Sidebar;
