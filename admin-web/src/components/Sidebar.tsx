import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Palmtree,
  Cloud
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "ventas", label: "Ventas & Boletas", icon: ShoppingCart },
    { id: "productos", label: "Productos & Stock", icon: Package },
    { id: "clientes", label: "Clientes / Fiados", icon: Users },
    { id: "caja", label: "Caja & Turnos", icon: Wallet },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "configuracion", label: "Configuración & Cloud", icon: Settings },
  ];

  return (
    <aside
      style={{
        width: "260px",
        minHeight: "100vh",
        backgroundColor: "rgba(10, 22, 17, 0.95)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "0 8px 24px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
          }}
        >
          <Palmtree size={24} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc", letterSpacing: "-0.3px" }}>
            La Palmera
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--primary-light)", fontWeight: "600" }}>
              Panel Web v23
            </span>
            <span
              style={{
                fontSize: "10px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: "600",
              }}
            >
              Cloud
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: isActive
                  ? "linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 100%)"
                  : "transparent",
                color: isActive ? "#34d399" : "var(--text-secondary)",
                fontWeight: isActive ? "600" : "500",
                fontSize: "14px",
                cursor: "pointer",
                transition: "var(--transition-fast)",
                borderLeft: isActive ? "3px solid #10b981" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.color = "#f8fafc";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={18} color={isActive ? "#10b981" : "currentColor"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Cloud Status Footer & User */}
      <div
        style={{
          paddingTop: "16px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Cloud size={18} color="#10b981" />
          <div style={{ fontSize: "11px" }}>
            <div style={{ color: "var(--text-primary)", fontWeight: "600" }}>PostgreSQL Neon</div>
            <div style={{ color: "var(--text-muted)" }}>Réplica Remota Online</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(52, 211, 153, 0.2)",
                color: "#34d399",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              {(user?.username || "A").substring(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                {user?.nombre || user?.username || "Administrador"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                {user?.rol || "Admin"}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Cerrar Sesión"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fb7185")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
