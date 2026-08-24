import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LaPalmeraLogo from "../../components/LaPalmeraLogo";
import "./Login.css";

function Login() {
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const destinoInicial = user?.rol === "vendedor" ? "/ventas" : "/dashboard";

  // Mostrar mensaje de sesión expirada si viene desde el redireccionamiento
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
    } catch (e) {
      // ignore
    }
  }, []);

  if (isAuthenticated)
    return <Navigate to={destinoInicial} replace />;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.usuario || !form.password) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    try {
      const data = await login(form.usuario, form.password, remember);
      navigate(
        data.usuario?.rol === "vendedor" ? "/ventas" : "/dashboard",
        { replace: true },
      );
    } catch (err) {
      setError(err.message || "Credenciales inválidas.");
    }
  };

  return (
    <div className="lp-login">
      <div className="lp-login__card">
        <div className="text-center">
          <LaPalmeraLogo variant="full" className="lp-login__logo-svg" />
          <h2 className="lp-login__title">LA PALMERA</h2>
          <p className="lp-login__subtitle">Sistema de Gestión para Minimarket</p>
        </div>

        {error && (
          <div className="lp-login__alert" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="lp-login__field">
            <label className="lp-login__label" htmlFor="lp-usuario">
              Usuario
            </label>
            <div className="lp-login__input-group">
              <span className="lp-login__input-icon" aria-hidden="true">
                <i className="bi bi-person"></i>
              </span>
              <input
                className="lp-login__input"
                type="text"
                name="usuario"
                id="lp-usuario"
                placeholder="Ingrese su usuario"
                value={form.usuario}
                onChange={handleChange}
                autoFocus
              />
            </div>
          </div>

          <div className="lp-login__field">
            <label className="lp-login__label" htmlFor="lp-password">
              Contraseña
            </label>
            <div className="lp-login__input-group">
              <span className="lp-login__input-icon" aria-hidden="true">
                <i className="bi bi-lock"></i>
              </span>
              <input
                className="lp-login__input"
                type="password"
                name="password"
                id="lp-password"
                placeholder="Ingrese su contraseña"
                value={form.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <label className="lp-login__check">
            <input
              className="lp-login__check-input"
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="lp-login__check-box" aria-hidden="true">
              <i className="bi bi-check-lg"></i>
            </span>
            <span className="lp-login__check-label">Recordar sesión</span>
          </label>

          <button
            className="lp-login__btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                ></span>
                Ingresando...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                Ingresar
              </>
            )}
          </button>
        </form>

        <footer className="lp-login__footer">
          <span>Seguro</span>
          <span className="lp-login__sep" aria-hidden="true">
            •
          </span>
          <span>Rápido</span>
          <span className="lp-login__sep" aria-hidden="true">
            •
          </span>
          <span>Confiable</span>
        </footer>
      </div>
    </div>
  );
}

export default Login;
