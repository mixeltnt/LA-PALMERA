import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success shadow-sm py-3">
      <div className="container-fluid px-4">
        <div className="d-flex align-items-center gap-3">
          <span className="fs-3">🌴</span>
          <div>
            <div className="navbar-brand fw-bold mb-0">La Palmera</div>
            <small className="text-white-50">Sistema de gestión</small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-4 ms-auto text-white">
          <div className="text-end d-none d-md-block">
            <div className="fw-semibold">{user?.name || "Administrador"}</div>
            <small>{user?.role || "Gerencia"}</small>
          </div>
          <div className="text-end d-none d-md-block">
            <div>{currentTime.toLocaleDateString("es-ES")}</div>
            <small>{currentTime.toLocaleTimeString("es-ES")}</small>
          </div>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
