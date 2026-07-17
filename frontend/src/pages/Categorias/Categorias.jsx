import { useCallback, useEffect, useState } from "react";
import categoryService from "../../services/categoryService";

const emptyForm = {
  nombre: "",
  descripcion: "",
  activo: true,
};

function Categorias() {
  const [categorias, setCategorias] = useState([]);
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
      const data = await categoryService.listar(buildParams());
      setCategorias(data.categorias);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (categoria) => {
    setEditing(categoria);
    setForm({
      nombre: categoria.nombre || "",
      descripcion: categoria.descripcion || "",
      activo: categoria.activo !== undefined ? categoria.activo : true,
    });
    setError("");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const validarForm = () => {
    const errores = [];
    if (!form.nombre.trim()) errores.push("El nombre de la categoría es obligatorio.");
    return errores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errores = validarForm();
    if (errores.length > 0) {
      setError(errores.join(". "));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await categoryService.actualizar(editing._id, form);
        setToast({ type: "success", text: "Categoría actualizada correctamente." });
      } else {
        await categoryService.crear(form);
        setToast({ type: "success", text: "Categoría creada correctamente." });
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      setError(err.message || "Error al guardar categoría.");
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
      await categoryService.eliminar(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setToast({ type: "success", text: "Categoría eliminada correctamente." });
      cargar();
    } catch (err) {
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setToast({ type: "danger", text: err.message || "Error al eliminar categoría." });
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Categorías</h3>
          <p className="text-muted small mb-0">Gestión de categorías de productos. Total: {total}</p>
        </div>
        <button className="btn btn-success" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>Nueva Categoría
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
                  placeholder="Buscar por nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
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
                      <th>Descripción</th>
                      <th>Estado</th>
                      <th className="text-center" style={{ width: 100 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((c) => (
                      <tr key={c._id}>
                        <td className="fw-semibold">{c.nombre}</td>
                        <td className="text-muted">{c.descripcion || "—"}</td>
                        <td>
                          <span className={`badge ${c.activo ? "bg-success" : "bg-secondary"}`}>
                            {c.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-center">
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(c)} title="Editar">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(c._id)} title="Eliminar">
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categorias.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No se encontraron categorías.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
                  <small className="text-muted">Página {page} de {totalPages} ({total} categorías)</small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                        <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <li key={n} className={`page-item ${n === page ? "active" : ""}`}>
                          <button className="page-link" onClick={() => setPage(n)}>{n}</button>
                        </li>
                      ))}
                      <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                        <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
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
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className={`bi ${editing ? "bi-pencil" : "bi-tag"} me-2`}></i>
                  {editing ? "Editar Categoría" : "Nueva Categoría"}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Nombre *</label>
                      <input className="form-control" name="nombre" value={form.nombre} onChange={handleFormChange} required placeholder="Ej: Lácteos" />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Descripción</label>
                      <textarea className="form-control" name="descripcion" rows={2} value={form.descripcion} onChange={handleFormChange} placeholder="Descripción de la categoría..."></textarea>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" role="switch" id="activo" name="activo" checked={form.activo} onChange={handleFormChange} />
                        <label className="form-check-label" htmlFor="activo">Categoría activa</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Guardando...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>{editing ? "Actualizar" : "Crear"} Categoría</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">Confirmar Eliminación</h6>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>
              <div className="modal-body text-center py-3">
                <i className="bi bi-exclamation-triangle text-danger fs-1 d-block mb-2"></i>
                <p className="mb-0 small">¿Estás seguro de eliminar esta categoría?<br />Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                  <i className="bi bi-trash me-1"></i>Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
          <div className={`alert alert-${toast.type} alert-dismissible d-flex align-items-center gap-2 shadow-sm mb-0`} role="alert">
            <i className={`bi ${toast.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`}></i>
            {toast.text}
            <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categorias;
