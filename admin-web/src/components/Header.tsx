import React, { useEffect, useState } from "react";
import { Database, RefreshCw, Menu } from "lucide-react";
import { adminApi, getBaseApiUrl } from "../services/api";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  onOpenMobileMenu,
}) => {
  const [cloudStatus, setCloudStatus] = useState<any>(null);

  const checkStatus = async () => {
    try {
      const res = await adminApi.getSyncStatus();
      setCloudStatus(res);
    } catch {
      setCloudStatus({ online: false });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = cloudStatus?.online && cloudStatus?.connected;

  return (
    <header
      style={{
        padding: "16px 24px",
        backgroundColor: "rgba(11, 19, 17, 0.9)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="btn-icon btn-secondary mobile-menu-trigger"
          title="Abrir Menú"
          style={{
            display: "none",
            flexShrink: 0,
          }}
        >
          <Menu size={20} color="#34d399" />
        </button>

        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: "19px",
              fontWeight: "800",
              color: "#f8fafc",
              letterSpacing: "-0.4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="header-subtitle"
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {/* Cloud Connection Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            background: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
            border: `1px solid ${isOnline ? "rgba(52, 211, 153, 0.3)" : "rgba(251, 113, 133, 0.3)"}`,
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: "700",
            color: isOnline ? "#34d399" : "#fb7185",
          }}
          title={`Backend: ${getBaseApiUrl()}`}
        >
          <span className={`pulse-dot ${isOnline ? "online" : "offline"}`} />
          <Database size={13} />
          <span className="cloud-badge-text">
            {isOnline ? "Neon Conectado" : "Desconectado"}
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px" }}
            title="Actualizar datos"
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span className="refresh-btn-text">Actualizar</span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .mobile-menu-trigger {
            display: inline-flex !important;
          }
          .header-subtitle {
            display: none !important;
          }
          .cloud-badge-text {
            display: none;
          }
          .refresh-btn-text {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
