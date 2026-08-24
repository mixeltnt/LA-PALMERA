import { useCallback, useEffect, useState } from "react";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";

const ROL_LABELS = {
  admin: { label: "Administrador", className: "bg-danger" },
  encargada: { label: "Encargada", className: "bg-info" },
  vendedor: { label: "Vendedor", className: "bg-secondary" },
};

const ESTADO_INICIAL = { nombre: "", usuario: "", password: "", rol: "vendedor" };

function Usuarios() {
  const { user: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [modal, setModal] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [cambiarEstado, setCambiarEstado] = useState(null);
  const [cambiando, setCambiando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const data = await userService.listar(params);
      setUsuarios(data.usuarios || []);
      setError("");
    } catch (err) {
      setUsuarios([]);
      setError(err.message || "Error al cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargar();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const abrirNuevo = () => {
    setForm(ESTADO_INICIAL);
    setEditandoId(null);
    setModal("crear");
  };

  const abrirEditar = (usuario) => {
    setForm({
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      password: "",
      rol: usuario.rol,
    });
    setEditandoId(usuario._id);
    setModal("editar");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.usuario.trim()) {
      setError("El nombre y el usuario son obligatorios.");
      return;
    }
    if (modal === "crear" && !form.password) {
      setError("La contraseña es obligatoria al crear un usuario.");
      return;
    }

    setGuardando(true);
    try {
      if (modal === "crear") {
        await userService.crear(form);
        setToast({ type: "success", text: "Usuario creado correctamente." });
      } else {
        const payload = {
          nombre: form.nombre,
          rol: form.rol,
          ...(form.password ? { password: form.password } : {}),
        };
        await userService.actualizar(editandoId, payload);
        setToast({ type: "success", text: "Usuario actualizado correctamente." });
      }
      setModal(null);
      void cargar();
    } catch (err) {
      setError(err.message || "Error al guardar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCambioEstado = async () => {
    if (!cambiarEstado) return;
    setCambiando(true);
    try {
      await userService.cambiarEstado(cambiarEstado._id, !cambiarEstado.activo);
      setCambiarEstado(null);
      setToast({
        type: "success",
        text: cambiarEstado.activo
          ? `Usuario '${cambiarEstado.usuario}' desactivado.`
          : `Usuario '${cambiarEstado.usuario}' activado.`,
      });
      void cargar();
    } catch (err) {
      setCambiarEstado(null);
      setError(err.message || "Error al cambiar el estado del usuario.");
    } finally {
      setCambiando(false);
    }
  };

  const formatFecha = (value) => {
    try {
      return new Date(value).toLocaleString("es-CL");
    } catch {
      return "—";
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Usuarios</h3>
          <p className="text-muted small mb-0">
            Administración de usuarios, roles y accesos al sistema.
          </p>
        </div>
        <button className="btn btn-success btn-sm" onClick={abrirNuevo}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo Usuario
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Buscar por nombre o usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th className="text-center" style={{ width: 140 }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length > 0 ? (
                    usuarios.map((usuario) => {
                      const rol = ROL_LABELS[usuario.rol] || {
                        label: usuario.rol,
                        className: "bg-secondary",
                      };
                      const esMiUsuario =
                        usuario._id === usuarioActual?._id;
                      return (
                        <tr key={usuario._id}>
                          <td className="fw-semibold">{usuario.nombre}</td>
                          <td>{usuario.usuario}</td>
                          <td>
                            <span className={`badge ${rol.className}`}>
                              {rol.label}
                            </span>
                          </td>
                          <td>
                            {usuario.activo ? (
                              <span className="badge bg-success">Activo</span>
                            ) : (
                              <span className="badge bg-danger">Inactivo</span>
                            )}
                          </td>
                          <td className="text-nowrap">
                            {formatFecha(usuario.createdAt)}
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-primary btn-icon me-1"
                              onClick={() => abrirEditar(usuario)}
                              title="Editar usuario"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className={`btn btn-sm btn-icon ${
                                usuario.activo
                                  ? "btn-outline-danger"
                                  : "btn-outline-success"
                              }`}
                              onClick={() => setCambiarEstado(usuario)}
                              disabled={esMiUsuario}
                              title={
                                esMiUsuario
                                  ? "No puedes desactivar tu propio usuario"
                                  : usuario.activo
                                    ? "Desactivar usuario"
                                    : "Activar usuario"
                              }
                            >
                              <i
                                className={`bi ${
                                  usuario.activo
                                    ? "bi-person-x"
                                    : "bi-person-check"
                                }`}
                              ></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-fill-gear me-2"></i>
                  {modal === "crear" ? "Nuevo Usuario" : "Editar Usuario"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModal(null)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small">
                      {error}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Nombre completo
                    </label>
                    <input
                      className="form-control"
                      type="text"
                      name="nombre"
                      placeholder="Ej: Karla"
                      value={form.nombre}
                      onChange={handleChange}
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Usuario
                    </label>
                    <input
                      className="form-control"
                      type="text"
                      name="usuario"
                      placeholder="Ej: karla"
                      value={form.usuario}
                      onChange={handleChange}
                      disabled={modal === "editar"}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Rol</label>
                    <select
                      className="form-select"
                      name="rol"
                      value={form.rol}
                      onChange={handleChange}
                    >
                      <option value="admin">Administrador</option>
                      <option value="encargada">Encargada</option>
                      <option value="vendedor">Vendedor</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">
                      {modal === "crear" ? "Contraseña" : "Nueva contraseña"}
                    </label>
                    <input
                      className="form-control"
                      type="password"
                      name="password"
                      placeholder={
                        modal === "editar"
                          ? "Dejar vacío para no cambiar"
                          : "Contraseña del usuario"
                      }
                      value={form.password}
                      onChange={handleChange}
                    />
                    {modal === "editar" && (
                      <div className="form-text small">
                        Deja vacío para mantener la contraseña actual.
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModal(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {modal === "crear" ? "Crear usuario" : "Guardar cambios"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {cambiarEstado && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">Confirmar cambio</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setCambiarEstado(null)}
                ></button>
              </div>
              <div className="modal-body text-center py-3">
                <i
                  className={`bi ${
                    cambiarEstado.activo
                      ? "bi-person-x text-danger"
                      : "bi-person-check text-success"
                  } fs-1 d-block mb-2`}
                ></i>
                <p className="mb-0 small">
                  ¿Seguro que deseas{" "}
                  <strong>
                    {cambiarEstado.activo ? "desactivar" : "activar"}
                  </strong>{" "}
                  al usuario <strong>{cambiarEstado.usuario}</strong>?
                  <br />
                  {cambiarEstado.activo &&
                    "No podrá iniciar sesión hasta reactivarlo."}
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCambiarEstado(null)}
                >
                  Cancelar
                </button>
                <button
                  className={`btn btn-sm ${
                    cambiarEstado.activo ? "btn-danger" : "btn-success"
                  }`}
                  onClick={confirmarCambioEstado}
                  disabled={cambiando}
                >
                  {cambiando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Procesando...
                    </>
                  ) : cambiarEstado.activo ? (
                    <>
                      <i className="bi bi-person-x me-1"></i>Desactivar
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-check me-1"></i>Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="app-toast position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div
            className={`alert alert-${toast.type} alert-dismissible d-flex align-items-center gap-2 shadow-sm mb-0`}
            role="alert"
          >
            <i
              className={`bi ${toast.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`}
            ></i>
            {toast.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setToast(null)}
            ></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Usuarios;