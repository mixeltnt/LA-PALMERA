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
  Cloud,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
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

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 90,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className="sidebar-root"
        style={{
          width: "260px",
          minHeight: "100vh",
          backgroundColor: "rgba(10, 22, 17, 0.98)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 16px",
          position: "sticky",
          top: 0,
          zIndex: 95,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px 18px 4px",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
                flexShrink: 0,
              }}
            >
              <Palmtree size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.3px", lineHeight: "1.2" }}>
                La Palmera
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                <span style={{ fontSize: "11px", color: "var(--primary-light)", fontWeight: "600" }}>
                  Panel Web v32
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#fbbf24",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontWeight: "700",
                  }}
                >
                  Cloud
                </span>
              </div>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            className="sidebar-close-mobile"
            onClick={onCloseMobile}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              padding: "6px",
              cursor: "pointer",
              display: "none",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "11px 12px",
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
                  textAlign: "left",
                }}
              >
                <Icon size={18} color={isActive ? "#10b981" : "currentColor"} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cloud Status Footer & User Profile */}
        <div
          style={{
            paddingTop: "14px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Cloud size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "11px", overflow: "hidden" }}>
              <div style={{ color: "var(--text-primary)", fontWeight: "600", whiteSpace: "nowrap" }}>PostgreSQL Neon</div>
              <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>Réplica Remota Online</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 4px 0 4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
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
                  flexShrink: 0,
                }}
              >
                {(user?.username || "A").substring(0, 1).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#f8fafc", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {user?.nombre || user?.username || "Administrador"}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "capitalize" }}>
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
                flexShrink: 0,
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-root {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            transform: ${isOpenMobile ? "translateX(0)" : "translateX(-100%)"};
            box-shadow: ${isOpenMobile ? "10px 0 30px rgba(0,0,0,0.8)" : "none"};
          }
          .sidebar-close-mobile {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};
