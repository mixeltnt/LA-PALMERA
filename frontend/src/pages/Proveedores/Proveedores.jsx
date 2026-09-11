import { useCallback, useEffect, useState, useRef } from "react";
import providerService from "../../services/providerService";
import compraService from "../../services/compraService";
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
  const [statsMap, setStatsMap] = useState({});
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

  // Estados para Modal de Detalle Analítico del Proveedor
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState("productos"); // "productos" o "compras"

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
      const [data, stats] = await Promise.all([
        providerService.listar(buildParams()),
        compraService.obtenerEstadisticasProveedores(),
      ]);
      setProveedores(data.proveedores || []);
      setStatsMap(stats || {});
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
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
      correo: proveedor.correo || proveedor.email || "",
      direccion: proveedor.direccion || "",
      ciudad: proveedor.ciudad || "",
      observaciones: proveedor.observaciones || "",
      activo: proveedor.activo !== undefined ? proveedor.activo : true,
    });
    setError("");
    setShowModal(true);
  };

  const openProveedorDetalle = async (proveedor) => {
    setSelectedProveedor(proveedor);
    setDetailTab("productos");
    setLoadingDetail(true);
    try {
      const provId = proveedor._id || proveedor.id;
      const [prods, allCompras] = await Promise.all([
        compraService.obtenerProductosProveedor(provId),
        compraService.listar({ limit: 100 }),
      ]);

      const comprasDelProveedor = (allCompras.compras || []).filter(
        (c) =>
          (c.proveedorId && String(c.proveedorId) === String(provId)) ||
          (c.proveedor?._id && String(c.proveedor._id) === String(provId)) ||
          (c.proveedorNombre && c.proveedorNombre.toLowerCase() === (proveedor.nombre || "").toLowerCase()),
      );

      setSupplierProducts(prods || []);
      setSupplierPurchases(comprasDelProveedor || []);
    } catch (e) {
      console.error("Error cargando detalle de proveedor:", e);
      setSupplierProducts([]);
      setSupplierPurchases([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    if (typeof newValue === "string" && name !== "rut") {
      newValue = newValue.trimStart();
    }

    if (name === "rut") {
      const formatted = formatRut(value);
      setForm((prev) => ({ ...prev, rut: formatted }));
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
    const payload = {
      ...form,
      nombre: normalizeText(form.nombre),
      rut: normalizeText(form.rut),
      contacto: normalizeText(form.contacto),
      telefono: normalizeText(form.telefono),
      email: normalizeText(form.correo),
      direccion: normalizeText(form.direccion),
      ciudad: normalizeText(form.ciudad),
      observaciones: normalizeText(form.observaciones),
    };
    setSaving(true);
    try {
      if (editing) {
        await providerService.actualizar(editing._id || editing.id, payload);
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
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-person-badge text-success me-2"></i>Proveedores y Abastecimiento
          </h3>
          <p className="text-muted small mb-0">
            Historial de compras, productos suministrados, precios y gestión de proveedores. Total: {total}
          </p>
        </div>
        <div className="d-flex gap-2">
          <a href="/compras" className="btn btn-outline-success shadow-sm">
            <i className="bi bi-truck me-1"></i>Ir a Compras
          </a>
          <button className="btn btn-success shadow-sm" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i>Nuevo Proveedor
          </button>
        </div>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} shadow-sm alert-dismissible fade show`} role="alert">
          <i className="bi bi-info-circle-fill me-2"></i>
          {toast.text}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
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
                <option value="todos">Todos los proveedores</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Principal de Proveedores con Analítica */}
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
                      <th>Proveedor / RUT</th>
                      <th>Contacto & Teléfono</th>
                      <th>Dirección</th>
                      <th className="text-center">Compras</th>
                      <th className="text-end">Total Invertido</th>
                      <th className="text-center">Última Compra</th>
                      <th className="text-center">Estado</th>
                      <th className="text-center" style={{ width: 140 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((p) => {
                      const provKey = String(p._id || p.id);
                      const stats = statsMap[provKey] || statsMap[p.nombre] || {
                        totalCompras: 0,
                        totalMonto: 0,
                        ultimaFecha: null,
                        totalProductos: 0,
                      };

                      return (
                        <tr key={p._id || p.id}>
                          <td>
                            <div className="fw-bold text-dark">{p.nombre}</div>
                            {p.rut && <div className="text-muted small">RUT: {p.rut}</div>}
                          </td>
                          <td>
                            <div>{p.contacto || "—"}</div>
                            {p.telefono && (
                              <div className="text-muted small">
                                <i className="bi bi-telephone me-1"></i>{p.telefono}
                              </div>
                            )}
                          </td>
                          <td>{p.direccion || p.ciudad || "—"}</td>
                          <td className="text-center">
                            <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                              {stats.totalCompras} compra{stats.totalCompras === 1 ? "" : "s"}
                            </span>
                          </td>
                          <td className="text-end fw-bold text-success">
                            ${Number(stats.totalMonto || 0).toLocaleString("es-CL")}
                          </td>
                          <td className="text-center text-muted">
                            {stats.ultimaFecha
                              ? new Date(`${stats.ultimaFecha}T12:00:00`).toLocaleDateString("es-CL")
                              : "Sin compras"}
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${p.activo !== false ? "bg-success" : "bg-secondary"}`}
                            >
                              {p.activo !== false ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-success btn-icon me-1"
                              onClick={() => openProveedorDetalle(p)}
                              title="Ver historial de productos y compras"
                            >
                              <i className="bi bi-bar-chart-line"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary btn-icon me-1"
                              onClick={() => openEdit(p)}
                              title="Editar"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger btn-icon"
                              onClick={() => confirmDelete(p._id || p.id)}
                              title="Eliminar"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {proveedores.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No se encontraron proveedores registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} proveedores)
                  </small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <li key={n} className={`page-item ${n === page ? "active" : ""}`}>
                          <button className="page-link" onClick={() => setPage(n)}>
                            {n}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* --- MODAL DETALLE ANALÍTICO DEL PROVEEDOR --- */}
      {selectedProveedor && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    <i className="bi bi-shop text-success me-2"></i>
                    {selectedProveedor.nombre}
                  </h5>
                  <small className="text-white-50">
                    RUT: {selectedProveedor.rut || "No especificado"} • Contacto: {selectedProveedor.contacto || "—"} • Tel: {selectedProveedor.telefono || "—"}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedProveedor(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Pestañas de Navegación del Detalle */}
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button
                      className={`nav-link fw-semibold ${detailTab === "productos" ? "active text-success" : "text-muted"}`}
                      onClick={() => setDetailTab("productos")}
                    >
                      <i className="bi bi-box-seam me-2"></i>
                      Productos Suministrados ({supplierProducts.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link fw-semibold ${detailTab === "compras" ? "active text-success" : "text-muted"}`}
                      onClick={() => setDetailTab("compras")}
                    >
                      <i className="bi bi-receipt me-2"></i>
                      Historial de Compras ({supplierPurchases.length})
                    </button>
                  </li>
                </ul>

                {loadingDetail ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Cargando detalles...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* PESTAÑA 1: PRODUCTOS SUMINISTRADOS Y PRECIOS */}
                    {detailTab === "productos" && (
                      <div>
                        <div className="table-responsive border rounded">
                          <table className="table table-hover align-middle mb-0 small">
                            <thead className="table-light">
                              <tr>
                                <th>Producto</th>
                                <th>Código</th>
                                <th className="text-center">Cant. Comprada</th>
                                <th className="text-end">Último Costo</th>
                                <th className="text-center">Rango Precios</th>
                                <th className="text-end">Total Gastado</th>
                                <th className="text-center">Última Compra</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supplierProducts.map((p, idx) => (
                                <tr key={idx}>
                                  <td className="fw-semibold text-dark">{p.nombre}</td>
                                  <td className="text-muted small">{p.codigo || "—"}</td>
                                  <td className="text-center fw-bold">{p.totalCantidad} un</td>
                                  <td className="text-end text-success fw-bold">
                                    ${Number(p.ultimoPrecio || 0).toLocaleString("es-CL")}
                                  </td>
                                  <td className="text-center text-muted small">
                                    {p.menorPrecio === p.mayorPrecio
                                      ? `$${p.menorPrecio.toLocaleString("es-CL")}`
                                      : `$${p.menorPrecio.toLocaleString("es-CL")} - $${p.mayorPrecio.toLocaleString("es-CL")}`}
                                  </td>
                                  <td className="text-end fw-bold text-dark">
                                    ${Number(p.totalGastado || 0).toLocaleString("es-CL")}
                                  </td>
                                  <td className="text-center text-muted">
                                    {p.ultimaFecha
                                      ? new Date(`${p.ultimaFecha}T12:00:00`).toLocaleDateString("es-CL")
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                              {supplierProducts.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="text-center text-muted py-4">
                                    No hay registros de compras asociadas a este proveedor aún.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* PESTAÑA 2: HISTORIAL DE COMPRAS */}
                    {detailTab === "compras" && (
                      <div>
                        <div className="table-responsive border rounded">
                          <table className="table table-hover align-middle mb-0 small">
                            <thead className="table-light">
                              <tr>
                                <th>N° Factura / Folio</th>
                                <th>Fecha</th>
                                <th className="text-center">Ítems</th>
                                <th className="text-center">Estado</th>
                                <th className="text-end">Monto Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supplierPurchases.map((c) => (
                                <tr key={c._id || c.id}>
                                  <td className="fw-semibold">
                                    {c.numeroDocumento || c.numeroFactura || `Folio #${c.folio || c.id}`}
                                  </td>
                                  <td>
                                    {c.fechaCompra || c.fecha
                                      ? new Date(c.fechaCompra || c.fecha).toLocaleDateString("es-CL")
                                      : "—"}
                                  </td>
                                  <td className="text-center">
                                    {(c.productos || c.items || []).length} productos
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-success">
                                      {c.estado || "Completada"}
                                    </span>
                                  </td>
                                  <td className="text-end fw-bold text-success">
                                    ${Number(c.total || 0).toLocaleString("es-CL")}
                                  </td>
                                </tr>
                              ))}
                              {supplierPurchases.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted py-4">
                                    No hay facturas o compras registradas con este proveedor.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedProveedor(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CREAR / EDITAR PROVEEDOR --- */}
      {showModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className={`bi ${editing ? "bi-pencil" : "bi-plus-lg"} me-2`}></i>
                  {editing ? "Editar Proveedor" : "Nuevo Proveedor"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body p-4">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Nombre / Razón Social *</label>
                      <input
                        className={`form-control ${formErrors.nombre ? "is-invalid" : ""}`}
                        name="nombre"
                        value={form.nombre}
                        onChange={handleFormChange}
                        required
                        autoFocus
                      />
                      {formErrors.nombre && (
                        <div className="invalid-feedback">{formErrors.nombre}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">RUT Proveedor</label>
                      <input
                        className={`form-control ${formErrors.rut ? "is-invalid" : ""}`}
                        name="rut"
                        placeholder="Ej: 76.123.456-7"
                        value={form.rut}
                        onChange={handleFormChange}
                      />
                      {formErrors.rut && (
                        <div className="invalid-feedback">{formErrors.rut}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Contacto / Vendedor</label>
                      <input
                        className="form-control"
                        name="contacto"
                        value={form.contacto}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Teléfono</label>
                      <input
                        className="form-control"
                        name="telefono"
                        value={form.telefono}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Correo Electrónico</label>
                      <input
                        type="email"
                        className={`form-control ${formErrors.correo ? "is-invalid" : ""}`}
                        name="correo"
                        value={form.correo}
                        onChange={handleFormChange}
                      />
                      {formErrors.correo && (
                        <div className="invalid-feedback">{formErrors.correo}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Ciudad / Comuna</label>
                      <input
                        className="form-control"
                        name="ciudad"
                        value={form.ciudad}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Dirección</label>
                      <input
                        className="form-control"
                        name="direccion"
                        value={form.direccion}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-muted">Observaciones</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        name="observaciones"
                        value={form.observaciones}
                        onChange={handleFormChange}
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="provActivo"
                          name="activo"
                          checked={form.activo}
                          onChange={handleFormChange}
                        />
                        <label className="form-check-label small" htmlFor="provActivo">
                          Proveedor Activo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success fw-bold" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar Proveedor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAR ELIMINACIÓN --- */}
      {showDeleteConfirm && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white py-2">
                <h6 className="modal-title fw-bold">
                  <i className="bi bi-trash me-2"></i>Confirmar Eliminación
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                ¿Estás seguro de que deseas eliminar este proveedor? El historial de compras se conservará.
              </div>
              <div className="modal-footer py-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger fw-bold"
                  onClick={handleDelete}
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Proveedores;
