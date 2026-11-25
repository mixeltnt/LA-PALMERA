import React, { useState, useEffect } from "react";
import { Server, Database, CheckCircle2, AlertCircle, Save, Globe, RefreshCw, Palette, Check } from "lucide-react";
import { getBaseApiUrl, setBaseApiUrl, adminApi } from "../services/api";

const THEMES = [
  {
    id: "emerald",
    name: "Esmeralda Neón",
    type: "Oscuro Neón",
    desc: "Tema insigne obsidian con resplandor verde esmeralda",
    colors: ["#0b1311", "#10b981", "#34d399"],
    badgeColor: "#10b981",
  },
  {
    id: "midnight",
    name: "Obsidian Midnight",
    type: "Ultra Oscuro",
    desc: "Negro carbón profundo con acentos menta y titanio",
    colors: ["#09090b", "#22c55e", "#71717a"],
    badgeColor: "#22c55e",
  },
  {
    id: "sapphire",
    name: "Azul Zafiro Cyber",
    type: "Cyberpunk",
    desc: "Azul cósmico profundo con acentos eléctricos y cian",
    colors: ["#060b17", "#0284c7", "#38bdf8"],
    badgeColor: "#38bdf8",
  },
  {
    id: "amethyst",
    name: "Amatista Imperial",
    type: "Púrpura Royale",
    desc: "Obsidian violeta místico con acentos fucsia y magenta",
    colors: ["#0d0714", "#9333ea", "#c084fc"],
    badgeColor: "#c084fc",
  },
  {
    id: "amber",
    name: "Ámbar Sunset",
    type: "Bronce Cálido",
    desc: "Carbón cálido con destellos dorados y ámbar de atardecer",
    colors: ["#120904", "#d97706", "#fbbf24"],
    badgeColor: "#f59e0b",
  },
  {
    id: "light",
    name: "Esmeralda Cristal",
    type: "Modo Claro",
    desc: "Fondos claros perlados con tarjetas glass y esmeralda",
    colors: ["#f0fdf4", "#059669", "#ffffff"],
    badgeColor: "#059669",
  },
  {
    id: "arctic",
    name: "Ártico Glaciar",
    type: "Modo Claro",
    desc: "Superficies blancas puras con reflejos de zafiro frío",
    colors: ["#f8fafc", "#0284c7", "#ffffff"],
    badgeColor: "#0284c7",
  },
];

export const ConfiguracionView: React.FC = () => {
  const [apiUrl, setApiUrl] = useState<string>(getBaseApiUrl());
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem("lapalmera_theme") || "emerald";
  });

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
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, []);

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem("lapalmera_theme", themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    setSavedMessage(`¡Tema "${THEMES.find(t => t.id === themeId)?.name}" activado correctamente!`);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBaseApiUrl(apiUrl);
    setSavedMessage("¡URL del backend guardada exitosamente!");
    setTimeout(() => setSavedMessage(null), 3500);
    testStatus();
  };

  return (
    <div className="page-container" style={{ maxWidth: "920px" }}>
      {savedMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            color: "var(--text-emerald)",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Apariencias y Temas Card */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <Palette size={20} color="#10b981" />
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
            Apariencias & Estilos Visuales
          </h3>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Personaliza los colores, iluminación y estilo visual del Panel Administrativo según tu preferencia.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                style={{
                  cursor: "pointer",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
                  background: isSelected ? "rgba(var(--primary-rgb, 16, 185, 129), 0.12)" : "rgba(0, 0, 0, 0.25)",
                  boxShadow: isSelected ? "var(--shadow-glow)" : "none",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {theme.colors.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "50%",
                            backgroundColor: c,
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                      {theme.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "var(--primary)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Check size={12} /> Activo
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                  {theme.desc}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "6px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "600",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {theme.type}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTheme(theme.id);
                    }}
                  >
                    {isSelected ? "Seleccionado" : "Aplicar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cloud Server Configuration Card */}
      <div className="glass-card" style={{ padding: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <Server size={20} color="#10b981" />
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
            Conexión con el Servidor Backend API
          </h3>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "18px", lineHeight: "1.5" }}>
          Configura el endpoint de conexión para sincronizar datos en tiempo real con Neon Cloud.
        </p>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              URL del Backend API
            </label>
            <input
              type="text"
              className="form-control"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://lapalmera-pos-api.onrender.com/api"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: "1 1 180px" }}>
              <Save size={16} />
              <span>Guardar URL</span>
            </button>

            <button type="button" onClick={testStatus} disabled={loadingStatus} className="btn btn-secondary" style={{ flex: "1 1 180px" }}>
              <RefreshCw size={16} style={{ animation: loadingStatus ? "spin 1s linear infinite" : "none" }} />
              <span>Probar Conexión</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cloud Replica PostgreSQL Info Card */}
      <div className="glass-card" style={{ padding: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <Database size={20} color="#f59e0b" />
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
            Estado de Neon Cloud (PostgreSQL)
          </h3>
        </div>

        {status?.online && status?.connected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#34d399",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <CheckCircle2 size={18} />
              <span>PostgreSQL Neon Cloud en línea y sincronizando en tiempo real.</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
                backgroundColor: "rgba(0,0,0,0.25)",
                padding: "14px",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Ventas en Nube:</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", marginTop: "2px" }}>
                  {status?.counts?.ventas_count || 0}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Productos:</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", marginTop: "2px" }}>
                  {status?.counts?.productos_count || 0}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Clientes:</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", marginTop: "2px" }}>
                  {status?.counts?.clientes_count || 0}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Turnos Caja:</span>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", marginTop: "2px" }}>
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
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(251, 113, 133, 0.3)",
              color: "#fb7185",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={18} />
            <span>Servidor API desconectado o no accesible.</span>
          </div>
        )}
      </div>

      {/* Cloud Info */}
      <div
        className="glass-card"
        style={{
          padding: "22px",
          background: "linear-gradient(145deg, rgba(16, 185, 129, 0.05) 0%, rgba(17, 32, 27, 0.9) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <Globe size={18} color="#38bdf8" />
          <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
            Acceso Móvil y Remoto (Render + Android APK)
          </h4>
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          Puedes acceder a este panel de administración tanto desde el navegador de tu teléfono celular mediante <code>https://lapalmera-pos-api.onrender.com/admin/</code> como instalando la aplicación móvil APK directa.
        </p>
      </div>
    </div>
  );
};
