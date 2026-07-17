import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    <nav className="navbar navbar-expand-lg navbar-dark bg-success px-4 shadow-sm" style={{ minHeight: 60 }}>
      <div className="container-fluid px-0">
        <button className="btn btn-outline-light btn-sm d-lg-none me-2" onClick={onToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>

        <span className="navbar-brand fw-semibold d-lg-none">La Palmera</span>

        <div className="d-flex align-items-center gap-3 ms-auto">
          <div className="text-end d-none d-md-block">
            <div className="text-white small fw-semibold">{user?.nombre || "Administrador"}</div>
            <div className="text-white-50 small text-capitalize">{user?.rol || "admin"}</div>
          </div>

          <div
            className="d-flex align-items-center justify-content-center rounded-circle bg-white text-success fw-bold"
            style={{ width: 38, height: 38, fontSize: 14 }}
            title={user?.nombre}
          >
            {initials}
          </div>

          <button className="btn btn-outline-light btn-sm" onClick={handleLogout} title="Cerrar sesión">
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
