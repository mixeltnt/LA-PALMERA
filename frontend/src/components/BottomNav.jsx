import React from "react";
import { NavLink } from "react-router-dom";

export const BottomNav = ({ onOpenMore }) => {
  return (
    <nav
      className="mobile-bottom-nav d-lg-none position-fixed bottom-0 start-0 end-0 bg-dark text-white border-top border-secondary shadow-lg z-3"
      style={{
        height: "calc(62px + env(safe-area-inset-bottom, 16px))",
        paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
      }}
    >
      <div className="d-flex justify-content-around align-items-center h-100 px-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 px-2 rounded ${
              isActive ? "text-success fw-bold" : "text-white-50"
            }`
          }
          style={{ minWidth: "56px" }}
        >
          <i className="bi bi-grid-fill fs-5 mb-1"></i>
          <span style={{ fontSize: "0.68rem" }}>Inicio</span>
        </NavLink>

        <NavLink
          to="/ventas"
          className={({ isActive }) =>
            `d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 px-2 rounded ${
              isActive ? "text-success fw-bold" : "text-white-50"
            }`
          }
          style={{ minWidth: "56px" }}
        >
          <i className="bi bi-cart-fill fs-5 mb-1"></i>
          <span style={{ fontSize: "0.68rem" }}>Ventas</span>
        </NavLink>

        <NavLink
          to="/productos"
          className={({ isActive }) =>
            `d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 px-2 rounded ${
              isActive ? "text-success fw-bold" : "text-white-50"
            }`
          }
          style={{ minWidth: "56px" }}
        >
          <i className="bi bi-box-seam-fill fs-5 mb-1"></i>
          <span style={{ fontSize: "0.68rem" }}>Stock</span>
        </NavLink>

        <NavLink
          to="/clientes"
          className={({ isActive }) =>
            `d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 px-2 rounded ${
              isActive ? "text-success fw-bold" : "text-white-50"
            }`
          }
          style={{ minWidth: "56px" }}
        >
          <i className="bi bi-people-fill fs-5 mb-1"></i>
          <span style={{ fontSize: "0.68rem" }}>Fiados</span>
        </NavLink>

        <button
          type="button"
          onClick={onOpenMore}
          className="btn btn-link d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 px-2 text-white-50 border-0"
          style={{ minWidth: "56px" }}
        >
          <i className="bi bi-list fs-5 mb-1 text-white"></i>
          <span style={{ fontSize: "0.68rem", color: "#adb5bd" }}>Más</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
