import React, { useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { adminApi, getBaseApiUrl } from "../services/api";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
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
        padding: "20px 32px",
        backgroundColor: "rgba(11, 19, 17, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#f8fafc", letterSpacing: "-0.5px" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Cloud Connection Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            background: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
            border: `1px solid ${isOnline ? "rgba(52, 211, 153, 0.3)" : "rgba(251, 113, 133, 0.3)"}`,
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "600",
            color: isOnline ? "#34d399" : "#fb7185",
          }}
          title={`Backend: ${getBaseApiUrl()}`}
        >
          <span className={`pulse-dot ${isOnline ? "online" : "offline"}`} />
          <Database size={14} />
          <span>{isOnline ? "Neon Cloud Conectado" : "Desconectado de la Nube"}</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>Actualizar</span>
          </button>
        )}
      </div>
    </header>
  );
};
