/**
 * ============================================================================
 * LA PALMERA POS — MÓDULO DE INICIO DE SESIÓN (LOGIN)
 * ============================================================================
 * Maneja la autenticación de usuarios (Yasna - Administradora / Karla - Supervisora)
 * y proporciona acceso rápido directo al Punto de Venta / Caja para cajeros.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LaPalmeraLogo from "../../components/LaPalmeraLogo";
import "./Login.css";

function Login() {
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Estado del formulario de acceso
  const [form, setForm] = useState({ usuario: "yasna", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef(null);

  // Destino inicial según el rol del usuario autenticado
  const destinoInicial =
    user?.rol === "cajero" || user?.rol === "vendedor" ? "/ventas" : "/dashboard";

  /**
   * Efecto para verificar si la sesión expiró previamente y mostrar advertencia
   */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lapalmera-session-expired");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.text) {
          setError(obj.text);
        }
        sessionStorage.removeItem("lapalmera-session-expired");
      }
    } catch {
      // Ignorar errores de parseo
    }
  }, []);

  // Si ya está autenticado, redirigir automáticamente
  if (isAuthenticated) return <Navigate to={destinoInicial} replace />;

  /**
   * Manejador de cambio en los campos de texto
   */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  /**
   * Selecciona rápidamente el usuario (Yasna o Karla) y enfoca el campo de contraseña
   */
  const handleSelectUser = (userType) => {
    setForm((prev) => ({ ...prev, usuario: userType }));
    setError("");
    passwordRef.current?.focus();
  };

  /**
   * Procesa el formulario de login administrativo
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUser = form.usuario.trim().toLowerCase();
    if (!cleanUser) {
      setError("Por favor seleccione su usuario.");
      return;
    }

    if (!form.password) {
      setError(`Ingrese la contraseña de ${cleanUser === "karla" ? "Karla" : "Yasna"}.`);
      return;
    }

    try {
      const data = await login(cleanUser, form.password);
      navigate(
        data.usuario?.rol === "cajero" || data.usuario?.rol === "vendedor"
          ? "/ventas"
          : "/dashboard",
        { replace: true }
      );
    } catch (err) {
      setError(err.message || "Contraseña incorrecta.");
    }
  };

  /**
   * Acceso rápido directo a Punto de Venta / Caja (rol cajero)
   */
  const handleQuickVentas = async () => {
    setError("");
    try {
      await login("ventas", "");
      navigate("/ventas", { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo ingresar a Ventas.");
    }
  };

  return (
    <div className="lp-login-screen">
      {/* Fondo ambiental sutil */}
      <div className="lp-login-bg-overlay"></div>

      {/* Contenedor Centrado Unificado */}
      <div className="lp-login-container position-relative z-1 d-flex flex-column align-items-center justify-content-center">
        <div className="lp-glass-card shadow-2xl">
          
          {/* Cabecera Unificada: Logo y Marca La Palmera */}
          <div className="text-center mb-4">
            <div className="d-flex justify-content-center mb-2">
              <LaPalmeraLogo
                variant="mark"
                style={{ width: 72, height: 72, filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.5))" }}
              />
            </div>
            <h1 className="fw-black text-white mb-0 lp-brand-title">La Palmera</h1>
            <div className="lp-brand-badge mb-1">MINIMARKET • SISTEMA POS</div>
            <p className="text-white-50 small mb-0">
              Tu barrio, siempre contigo <span className="text-success">💚</span>
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-3" role="alert">
              <i className="bi bi-exclamation-circle-fill fs-5"></i>
              <div>{error}</div>
            </div>
          )}

          {/* Formulario de Acceso */}
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            {/* Selector de Usuario (Yasna / Karla) */}
            <div>
              <label className="text-white small fw-semibold mb-2 d-block">
                Selecciona tu Usuario:
              </label>
              <div className="row g-2">
                <div className="col-6">
                  <button
                    type="button"
                    className={`btn w-100 p-2 d-flex align-items-center gap-2 rounded-3 text-start lp-user-btn ${
                      form.usuario === "yasna" ? "active" : ""
                    }`}
                    onClick={() => handleSelectUser("yasna")}
                  >
                    <div className="lp-user-avatar-circle">
                      <i className="bi bi-person-fill"></i>
                    </div>
                    <div className="overflow-hidden flex-grow-1">
                      <div className="fw-bold text-white small">Yasna</div>
                      <div className="text-white-50" style={{ fontSize: "0.72rem" }}>Administradora</div>
                    </div>
                    {form.usuario === "yasna" && (
                      <i className="bi bi-check-circle-fill text-success fs-6 ms-auto"></i>
                    )}
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className={`btn w-100 p-2 d-flex align-items-center gap-2 rounded-3 text-start lp-user-btn ${
                      form.usuario === "karla" ? "active" : ""
                    }`}
                    onClick={() => handleSelectUser("karla")}
                  >
                    <div className="lp-user-avatar-circle">
                      <i className="bi bi-person-fill"></i>
                    </div>
                    <div className="overflow-hidden flex-grow-1">
                      <div className="fw-bold text-white small">Karla</div>
                      <div className="text-white-50" style={{ fontSize: "0.72rem" }}>Supervisora</div>
                    </div>
                    {form.usuario === "karla" && (
                      <i className="bi bi-check-circle-fill text-success fs-6 ms-auto"></i>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Input de Contraseña */}
            <div>
              <label className="text-white small fw-semibold mb-1 d-block" htmlFor="lp-pass-input">
                Contraseña de {form.usuario === "karla" ? "Karla" : "Yasna"}
              </label>
              <div className="input-group lp-input-group">
                <span className="input-group-text bg-transparent border-0 text-success">
                  <i className="bi bi-lock-fill fs-5"></i>
                </span>
                <input
                  ref={passwordRef}
                  id="lp-pass-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-control bg-transparent border-0 text-white shadow-none ps-0"
                  placeholder="Ingresa tu contraseña"
                  value={form.password}
                  onChange={handleChange}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn bg-transparent border-0 text-white-50"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            {/* Botón Principal: Ingresar al Sistema */}
            <button
              type="submit"
              className="btn btn-success w-100 py-3 fw-bold rounded-3 shadow-lg d-flex align-items-center justify-content-center gap-2 lp-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  Iniciando Sesión...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right fs-5"></i>
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Acceso Rápido a Punto de Venta / Caja */}
          <div className="text-center mt-3 pt-3 border-top border-white border-opacity-10">
            <button
              type="button"
              className="btn btn-sm btn-outline-success text-white w-100 py-2 rounded-3 lp-quick-ventas-btn"
              onClick={handleQuickVentas}
              disabled={loading}
            >
              <i className="bi bi-lightning-charge-fill text-warning me-1"></i> Abrir <strong>Punto de Venta / Caja</strong> (Cajero Rápido)
            </button>
          </div>

          {/* Pie del Panel */}
          <div className="text-center text-white-50 small mt-3" style={{ fontSize: "0.78rem" }}>
            100% Local • Seguro
          </div>
        </div>

        {/* Crédito Sutil del Desarrollador */}
        <div className="text-center text-white-50 mt-3 lp-dev-credit">
          <span>by MixelTNT</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
