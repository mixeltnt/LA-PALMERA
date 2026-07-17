import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function Login() {
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

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
      await login(form.usuario, form.password, remember);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Credenciales inválidas.");
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-success-subtle">
      <div className="card shadow-lg border-0" style={{ width: 420, borderRadius: 16 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div className="mb-3">
              <img src="/favicon.svg" alt="La Palmera" width="64" height="64" />
            </div>
            <h2 className="fw-bold text-success">LA PALMERA</h2>
            <p className="text-muted small">Sistema de Gestión para Minimarket</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              <i className="bi bi-exclamation-triangle me-1"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold">Usuario</label>
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  className="form-control"
                  type="text"
                  name="usuario"
                  placeholder="Ingrese su usuario"
                  value={form.usuario}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  placeholder="Ingrese su contraseña"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="remember">
                  Recordar sesión
                </label>
              </div>
            </div>

            <button
              className="btn btn-success w-100 py-2 fw-semibold"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Ingresando...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
