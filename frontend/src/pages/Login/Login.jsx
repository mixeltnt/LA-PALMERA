import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (form.username && form.password) {
      login({ name: form.username, role: "Administrador" });
      navigate("/dashboard");
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex justify-content-center align-items-center bg-light">
      <div
        className="card shadow-lg p-5"
        style={{ width: "420px", borderRadius: "20px" }}
      >
        <div className="text-center mb-4">
          <h1 style={{ fontSize: "60px" }}>🌴</h1>
          <h2 className="fw-bold text-success">LA PALMERA</h2>
          <p className="text-muted">Sistema de Gestión para Minimarket</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Usuario</label>
            <input
              className="form-control"
              type="text"
              name="username"
              placeholder="Ingrese su usuario"
              value={form.username}
              onChange={handleChange}
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Contraseña</label>
            <input
              className="form-control"
              type="password"
              name="password"
              placeholder="Ingrese su contraseña"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button className="btn btn-success w-100" type="submit">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
