import { useCallback, useEffect, useState, useRef } from "react";
import providerService from "../../services/providerService";
import {
  normalizeText,
  validateEmail,
  validarRut,
  formatRut,
  mapBackendErrors,
} from "../../utils/validators";

const emptyForm = {
  nombre: "",
  rut: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
  ciudad: "",
  observaciones: "",
  activo: true,
};

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const rutRef = useRef(null);

  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [toast, setToast] = useState(null);

  const buildParams = useCallback(() => {
    const params = { page, limit: 10 };
    if (search) params.search = search;
    if (filtro === "activos") params.activo = "true";
    if (filtro === "inactivos") params.activo = "false";
    return params;
  }, [search, filtro, page]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await providerService.listar(buildParams());
      setProveedores(data.proveedores);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [search, filtro]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = (e) => setSearch(e.target.value);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  const openEdit = (proveedor) => {
    setEditing(proveedor);
    setForm({
      nombre: proveedor.nombre || "",
      rut: proveedor.rut || "",
      contacto: proveedor.contacto || "",
      telefono: proveedor.telefono || "",
      correo: proveedor.correo || "",
      direccion: proveedor.direccion || "",
      ciudad: proveedor.ciudad || "",
      observaciones: proveedor.observaciones || "",
      activo: proveedor.activo !== undefined ? proveedor.activo : true,
    });
    setError("");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    // Trim leading/trailing spaces automatically for text fields
    if (typeof newValue === "string" && name !== "rut") {
      newValue = newValue.trimStart();
    }

    if (name === "rut") {
      // format rut as user types and preserve cursor approximately
      const input = value;
      const selectionStart = e.target.selectionStart || 0;
      const rawBeforeCursor = input
        .slice(0, selectionStart)
        .replace(/[^0-9kK]/g, "")
        .toUpperCase();
      const formatted = formatRut(input);
      setForm((prev) => ({ ...prev, rut: formatted }));
      setTimeout(() => {
        try {
          if (rutRef.current) {
            // compute new cursor position based on number of raw chars before cursor
            const raw = formatted.replace(/[^0-9kK]/g, "");
            const posRaw = Math.min(rawBeforeCursor.length, raw.length);
            // find position in formatted that corresponds to posRaw
            let cnt = 0;
            let newPos = 0;
            for (let i = 0; i < formatted.length; i++) {
              if (/[^0-9kK]/.test(formatted[i]) === false) cnt++;
              if (cnt >= posRaw) {
                newPos = i + 1;
                break;
              }
            }
            rutRef.current.selectionStart = rutRef.current.selectionEnd =
              newPos || formatted.length;
          }
        } catch (err) {
          // ignore
        }
      }, 0);
      setFormErrors((prev) => ({ ...prev, rut: undefined }));
      setError("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : newValue,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    setError("");
  };

  const validarForm = () => {
    const errores = {};
    if (!normalizeText(form.nombre))
      errores.nombre = "El nombre del proveedor es obligatorio.";
    if (form.correo && !validateEmail(form.correo))
      errores.correo = "El correo debe tener un formato válido.";
    if (form.rut && !validarRut(form.rut))
      errores.rut = "El RUT ingresado no es válido.";
    // trim all text fields before sending
    return errores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errores = validarForm();
    const hasErrors = Object.keys(errores).length > 0;
    if (hasErrors) {
      setFormErrors(errores);
      return;
    }
    // normalize all text fields
    const payload = {
      ...form,
      nombre: normalizeText(form.nombre),
      rut: normalizeText(form.rut),
      contacto: normalizeText(form.contacto),
      telefono: normalizeText(form.telefono),
      correo: normalizeText(form.correo),
      direccion: normalizeText(form.direccion),
      ciudad: normalizeText(form.ciudad),
      observaciones: normalizeText(form.observaciones),
    };
    setSaving(true);
    try {
      if (editing) {
        await providerService.actualizar(editing._id, payload);
        setToast({
          type: "success",
          text: "Proveedor actualizado correctamente.",
        });
      } else {
        await providerService.crear(payload);
        setToast({ type: "success", text: "Proveedor creado correctamente." });
      }
      setShowModal(false);
      setForm({ ...emptyForm });
      setFormErrors({});
      cargar();
    } catch (err) {
      // Prefer backend field errors when available
      if (err && err.errores) {
        const mapped = mapBackendErrors(err.errores);
        setFormErrors(mapped);
        if (mapped._global) setError(mapped._global);
        else setError(err.message || "Error al guardar proveedor.");
      } else {
        setError(err.message || "Error al guardar proveedor.");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await providerService.eliminar(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setToast({ type: "success", text: "Proveedor eliminado correctamente." });
      cargar();
    } catch {
      // silent
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Proveedores</h3>
          <p className="text-muted small mb-0">
            Gestión de proveedores y abastecimiento. Total: {total}
          </p>
        </div>
        <button className="btn btn-success" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo Proveedor
        </button>
      </div>

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
                  placeholder="Buscar por nombre, RUT, contacto o ciudad..."
                  value={search}
                  onChange={handleSearch}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
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
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>RUT</th>
                      <th>Contacto</th>
                      <th>Teléfono</th>
                      <th>Correo</th>
                      <th>Ciudad</th>
                      <th>Estado</th>
                      <th className="text-center" style={{ width: 100 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((p) => (
                      <tr key={p._id}>
                        <td className="fw-semibold">{p.nombre}</td>
                        <td>{p.rut || "—"}</td>
                        <td>{p.contacto || "—"}</td>
                        <td>{p.telefono || "—"}</td>
                        <td>{p.correo || "—"}</td>
                        <td>{p.ciudad || "—"}</td>
                        <td>
                          <span
                            className={`badge ${p.activo ? "bg-success" : "bg-secondary"}`}
                          >
                            {p.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openEdit(p)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => confirmDelete(p._id)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {proveedores.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No se encontraron proveedores.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} proveedores)
                  </small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`page-item ${page <= 1 ? "disabled" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (n) => (
                          <li
                            key={n}
                            className={`page-item ${n === page ? "active" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setPage(n)}
                            >
                              {n}
                            </button>
                          </li>
                        ),
                      )}
                      <li
                        className={`page-item ${page >= totalPages ? "disabled" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i
                    className={`bi ${editing ? "bi-pencil" : "bi-plus-lg"} me-2`}
                  ></i>
                  {editing ? "Editar Proveedor" : "Nuevo Proveedor"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Nombre *
                      </label>
                      <input
                        className={`form-control ${formErrors.nombre ? "is-invalid" : ""}`}
                        name="nombre"
                        value={form.nombre}
                        onChange={handleFormChange}
                        required
                      />
                      {formErrors.nombre && (
                        <div className="invalid-feedback">
                          {formErrors.nombre}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        RUT
                      </label>
                      <input
                        ref={rutRef}
                        className={`form-control ${formErrors.rut ? "is-invalid" : ""}`}
                        name="rut"
                        value={form.rut}
                        onChange={handleFormChange}
                        placeholder="12.345.678-9"
                      />
                      {formErrors.rut && (
                        <div className="invalid-feedback">{formErrors.rut}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Contacto
                      </label>
                      <input
                        className={`form-control ${formErrors.contacto ? "is-invalid" : ""}`}
                        name="contacto"
                        value={form.contacto}
                        onChange={handleFormChange}
                      />
                      {formErrors.contacto && (
                        <div className="invalid-feedback">
                          {formErrors.contacto}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Teléfono
                      </label>
                      <input
                        className={`form-control ${formErrors.telefono ? "is-invalid" : ""}`}
                        name="telefono"
                        value={form.telefono}
                        onChange={handleFormChange}
                      />
                      {formErrors.telefono && (
                        <div className="invalid-feedback">
                          {formErrors.telefono}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Correo
                      </label>
                      <input
                        className={`form-control ${formErrors.correo ? "is-invalid" : ""}`}
                        name="correo"
                        type="email"
                        value={form.correo}
                        onChange={handleFormChange}
                      />
                      {formErrors.correo && (
                        <div className="invalid-feedback">
                          {formErrors.correo}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Ciudad
                      </label>
                      <input
                        className="form-control"
                        name="ciudad"
                        value={form.ciudad}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        Dirección
                      </label>
                      <input
                        className="form-control"
                        name="direccion"
                        value={form.direccion}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        Observaciones
                      </label>
                      <textarea
                        className="form-control"
                        name="observaciones"
                        rows={3}
                        value={form.observaciones}
                        onChange={handleFormChange}
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="activo"
                          name="activo"
                          checked={form.activo}
                          onChange={handleFormChange}
                        />
                        <label className="form-check-label" htmlFor="activo">
                          Proveedor activo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {editing ? "Actualizar" : "Crear"} Proveedor
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">Confirmar Eliminación</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              <div className="modal-body text-center py-3">
                <i className="bi bi-exclamation-triangle text-danger fs-1 d-block mb-2"></i>
                <p className="mb-0 small">
                  ¿Estás seguro de eliminar este proveedor?
                  <br />
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                >
                  <i className="bi bi-trash me-1"></i>Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
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

export default Proveedores;
