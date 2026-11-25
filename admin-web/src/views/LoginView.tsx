import React, { useState } from "react";
import { Palmtree, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Server } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getBaseApiUrl, setBaseApiUrl } from "../services/api";

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("yasna");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState(getBaseApiUrl());
  const [showConfigUrl, setShowConfigUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (apiUrl !== getBaseApiUrl()) {
        setBaseApiUrl(apiUrl);
      }
      await login(username, password);
    } catch (err: any) {
      setError(err?.message || "Credenciales incorrectas o servidor no disponible.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (u: string) => {
    setUsername(u);
    setPassword("");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "radial-gradient(circle at 50% 30%, #0d281e 0%, #08100e 100%)",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 25px rgba(16, 185, 129, 0.4)",
              marginBottom: "12px",
            }}
          >
            <Palmtree size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px" }}>
            La Palmera
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "3px" }}>
            Panel Web Administrativo • v32 Cloud
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Usuario Administrador / Encargada
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "13px" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "36px" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "13px" }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: "36px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
              />
            </div>
          </div>

          {showConfigUrl && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
                URL del Servidor API
              </label>
              <div style={{ position: "relative" }}>
                <Server size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "13px" }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: "36px", fontSize: "12px" }}
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://lapalmera-pos-api.onrender.com/api"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "6px", fontSize: "15px" }}
          >
            {loading ? (
              <span>Iniciando sesión...</span>
            ) : (
              <>
                <span>Ingresar al Panel</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Access Badges for Admin Accounts */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", marginTop: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>Accesos rápidos sugeridos:</span>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleSelectAccount("yasna")}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
            >
              Yasna (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleSelectAccount("karla")}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
            >
              Karla (Supervisora)
            </button>
          </div>
        </div>

        {/* Toggle Server URL */}
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setShowConfigUrl(!showConfigUrl)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "11px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {showConfigUrl ? "Ocultar configuración de servidor" : "Configurar URL de servidor API"}
          </button>
        </div>
      </div>
    </div>
  );
};
