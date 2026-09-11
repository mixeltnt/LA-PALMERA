import React, { useState, useEffect } from "react";
import { Server, Database, CheckCircle2, AlertCircle, Save, Globe, RefreshCw } from "lucide-react";
import { getBaseApiUrl, setBaseApiUrl, adminApi } from "../services/api";

export const ConfiguracionView: React.FC = () => {
  const [apiUrl, setApiUrl] = useState<string>(getBaseApiUrl());
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const testStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await adminApi.getSyncStatus();
      setStatus(res);
    } catch (err: any) {
      setStatus({ online: false, error: err?.message || "No se pudo conectar al servidor." });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    testStatus();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBaseApiUrl(apiUrl);
    setSavedMessage("¡URL del backend guardada exitosamente!");
    setTimeout(() => setSavedMessage(null), 3500);
    testStatus();
  };

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>
      {savedMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            color: "#34d399",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Cloud Server Configuration Card */}
      <div className="glass-card" style={{ padding: "26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Server size={22} color="#10b981" />
          <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
            Conexión con el Servidor Backend API
          </h3>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: "1.5" }}>
          Puedes apuntar este panel al backend local (<code>http://localhost:4000/api</code>) o a tu backend gratuito en la nube (Render / Railway) cuando esté publicado.
        </p>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              URL del Backend API
            </label>
            <input
              type="text"
              className="form-control"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:4000/api o https://api.lapalmerapos.com/api"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>Guardar Configuración</span>
            </button>

            <button type="button" onClick={testStatus} disabled={loadingStatus} className="btn btn-secondary">
              <RefreshCw size={16} style={{ animation: loadingStatus ? "spin 1s linear infinite" : "none" }} />
              <span>Probar Conexión</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cloud Replica PostgreSQL Info Card */}
      <div className="glass-card" style={{ padding: "26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Database size={22} color="#f59e0b" />
          <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
            Estado de la Base de Datos PostgreSQL Neon Cloud
          </h3>
        </div>

        {status?.online && status?.connected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#34d399",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              <CheckCircle2 size={18} />
              <span>PostgreSQL Neon Cloud en línea y respondiendo en tiempo real.</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                backgroundColor: "rgba(0,0,0,0.25)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Ventas en Nube:</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  {status?.counts?.ventas_count || 0}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Productos:</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  {status?.counts?.productos_count || 0}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Clientes:</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  {status?.counts?.clientes_count || 0}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Turnos Caja:</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  {status?.counts?.caja_sesiones_count || 0}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(251, 113, 133, 0.3)",
              color: "#fb7185",
              fontSize: "14px",
            }}
          >
            <AlertCircle size={18} />
            <span>Servidor API desconectado o no accesible.</span>
          </div>
        )}
      </div>

      {/* Cloud Deployment Info */}
      <div
        className="glass-card"
        style={{
          padding: "26px",
          background: "linear-gradient(145deg, rgba(16, 185, 129, 0.05) 0%, rgba(17, 32, 27, 0.9) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <Globe size={20} color="#38bdf8" />
          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>
            Despliegue Gratuito en la Nube (Render.com)
          </h4>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          Tu proyecto ya cuenta con el archivo de despliegue automatizado <code>render.yaml</code>. Al conectarlo a Render, obtendrás una URL pública segura (SSL) para acceder a este panel desde cualquier teléfono, tablet o computador del mundo sin costo.
        </p>
      </div>
    </div>
  );
};
