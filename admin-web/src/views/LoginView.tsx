import React, { useState } from "react";
import { Palmtree, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Server } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getBaseApiUrl, setBaseApiUrl } from "../services/api";

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("yasna");
  const [password, setPassword] = useState("Carlos1941");
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

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(circle at 50% 30%, #0d281e 0%, #08100e 100%)",
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              boxShadow: "0 8px 25px rgba(16, 185, 129, 0.4)",
            }}
          >
            <Palmtree size={36} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px" }}>
            La Palmera POS
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Panel Web Administrativo • Versión 23
          </p>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Usuario
            </label>
            <div style={{ position: "relative" }}>
              <User size={18} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "12px" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "42px" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. yasna, karla"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "12px" }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: "42px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", marginTop: "8px" }}
          >
            {loading ? "Verificando..." : "Ingresar al Panel"}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick presets for testing */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textAlign: "center" }}>
            Acceso Rápido de Prueba:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin("yasna", "Carlos1941")}
            >
              <ShieldCheck size={14} color="#10b981" />
              Yasna (Admin)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin("karla", "Karla2004")}
            >
              <ShieldCheck size={14} color="#f59e0b" />
              Karla (Encargada)
            </button>
          </div>
        </div>

        {/* API Server toggle */}
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setShowConfigUrl(!showConfigUrl)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Server size={14} />
            {showConfigUrl ? "Ocultar URL de Servidor" : "Configurar URL de Servidor API"}
          </button>

          {showConfigUrl && (
            <div style={{ marginTop: "12px", textAlign: "left" }}>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: "12px" }}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:4000/api o https://tu-render.onrender.com/api"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
