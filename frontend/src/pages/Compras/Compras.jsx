import { useCallback, useEffect, useState } from "react";
import compraService from "../../services/compraService";
import providerService from "../../services/providerService";
import productService from "../../services/productService";

const emptyLine = {
  producto: "",
  cantidad: 1,
  precioCompra: "",
  subtotal: 0,
};

const emptyForm = {
  proveedor: "",
  fechaCompra: new Date().toISOString().slice(0, 10),
  numeroDocumento: "",
  observaciones: "",
  productos: [{ ...emptyLine }],
};

function Compras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [detalleCompra, setDetalleCompra] = useState(null);

  const buildParams = useCallback(() => {
    const params = { page, limit: 10 };
    if (search) params.search = search;
    return params;
  }, [search, page]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await compraService.listar(buildParams());
      setCompras(data.compras);
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
    providerService
      .listarTodas()
      .then(setProveedores)
      .catch(() => {});
    productService
      .listar({ limit: 100 })
      .then((data) => setProductos(data.productos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, productos: [{ ...emptyLine }] });
    setError("");
    setShowForm(true);
  };

  const openDetail = async (id) => {
    try {
      const data = await compraService.obtener(id);
      setDetalleCompra(data);
    } catch {
      setToast({ type: "danger", text: "No se pudo cargar la compra." });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleLineChange = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.productos];
      next[index] = { ...next[index], [field]: value };
      if (field === "cantidad" || field === "precioCompra") {
        const cantidad = Number(next[index].cantidad || 0);
        const precio = Number(next[index].precioCompra || 0);
        next[index].subtotal = cantidad * precio;
      }
      return { ...prev, productos: next };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      productos: [...prev.productos, { ...emptyLine }],
    }));
  };

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const calcularTotal = () => {
    return form.productos.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0,
    );
  };

  const validarForm = () => {
    const errores = [];
    if (!form.proveedor) errores.push("El proveedor es obligatorio.");
    if (!form.numeroDocumento.trim())
      errores.push("El número de documento es obligatorio.");
    if (!form.productos.length)
      errores.push("Debe agregar al menos un producto.");
    form.productos.forEach((line, index) => {
      if (!line.producto)
        errores.push(`La línea ${index + 1} debe incluir un producto.`);
      if (!Number(line.cantidad) || Number(line.cantidad) <= 0)
        errores.push(
          `La cantidad de la línea ${index + 1} debe ser mayor a 0.`,
        );
      if (!Number(line.precioCompra) || Number(line.precioCompra) <= 0)
        errores.push(`El precio de la línea ${index + 1} debe ser mayor a 0.`);
    });
    const productosIds = form.productos.map((line) => line.producto);
    if (new Set(productosIds).size !== productosIds.length)
      errores.push("No se permiten productos duplicados.");
    return errores;
  };

  const guardar = async (confirmar = false) => {
    const errores = validarForm();
    if (errores.length > 0) {
      setError(errores.join(". "));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        estado: confirmar ? "CONFIRMADA" : "BORRADOR",
        total: calcularTotal(),
      };
      if (editingId) {
        await compraService.actualizar(editingId, payload);
        setToast({
          type: "success",
          text: "Compra actualizada correctamente.",
        });
      } else {
        const creada = await compraService.crear(payload);
        if (confirmar) {
          await compraService.confirmar(creada._id);
        }
        setToast({
          type: "success",
          text: confirmar
            ? "Compra confirmada correctamente."
            : "Compra guardada como borrador.",
        });
      }
      setShowForm(false);
      setForm({ ...emptyForm, productos: [{ ...emptyLine }] });
      cargar();
    } catch (err) {
      setError(err.message || "Error al guardar la compra.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Compras</h3>
          <p className="text-muted small mb-0">
            Registro de compras del minimarket.
          </p>
        </div>
        <button className="btn btn-success" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>Nueva Compra
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
                  placeholder="Buscar por número de documento..."
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
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>N° Documento</th>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Estado</th>
                      <th className="text-end">Total</th>
                      <th className="text-center" style={{ width: 100 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((c) => (
                      <tr key={c._id}>
                        <td className="fw-semibold">{c.numeroDocumento}</td>
                        <td>
                          {new Date(c.fechaCompra).toLocaleDateString("es-CL")}
                        </td>
                        <td>{c.proveedor?.nombre || "—"}</td>
                        <td>
                          <span
                            className={`badge ${c.estado === "CONFIRMADA" ? "bg-success" : "bg-secondary"}`}
                          >
                            {c.estado}
                          </span>
                        </td>
                        <td className="text-end">
                          ${Number(c.total || 0).toLocaleString("es-CL")}
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openDetail(c._id)}
                            title="Detalle"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {compras.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No se encontraron compras.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} compras)
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

      {showForm && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-truck me-2"></i>
                  {editingId ? "Editar Compra" : "Nueva Compra"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowForm(false)}
                ></button>
              </div>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger py-2 small">{error}</div>
                )}
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Proveedor
                    </label>
                    <select
                      className="form-select"
                      name="proveedor"
                      value={form.proveedor}
                      onChange={handleChange}
                    >
                      <option value="">Seleccione un proveedor</option>
                      {proveedores.map((prov) => (
                        <option key={prov._id} value={prov._id}>
                          {prov.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      Fecha
                    </label>
                    <input
                      className="form-control"
                      type="date"
                      name="fechaCompra"
                      value={form.fechaCompra}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">
                      N° Documento
                    </label>
                    <input
                      className="form-control"
                      name="numeroDocumento"
                      value={form.numeroDocumento}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">
                      Observaciones
                    </label>
                    <textarea
                      className="form-control"
                      name="observaciones"
                      rows={2}
                      value={form.observaciones}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">Productos</h6>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={addLine}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Agregar producto
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "35%" }}>Producto</th>
                          <th style={{ width: "15%" }}>Cantidad</th>
                          <th style={{ width: "20%" }}>Precio Compra</th>
                          <th style={{ width: "20%" }}>Subtotal</th>
                          <th style={{ width: "10%" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.productos.map((line, index) => (
                          <tr key={index}>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={line.producto}
                                onChange={(e) =>
                                  handleLineChange(
                                    index,
                                    "producto",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">Seleccione producto</option>
                                {productos.map((prod) => (
                                  <option key={prod._id} value={prod._id}>
                                    {prod.nombre}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                className="form-control form-control-sm"
                                type="number"
                                min="1"
                                value={line.cantidad}
                                onChange={(e) =>
                                  handleLineChange(
                                    index,
                                    "cantidad",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="form-control form-control-sm"
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.precioCompra}
                                onChange={(e) =>
                                  handleLineChange(
                                    index,
                                    "precioCompra",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td>
                              $
                              {Number(line.subtotal || 0).toLocaleString(
                                "es-CL",
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeLine(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-3">
                  <h5 className="fw-bold">
                    TOTAL: ${calcularTotal().toLocaleString("es-CL")}
                  </h5>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={() => guardar(false)}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar Borrador"}
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => guardar(true)}
                  disabled={saving}
                >
                  {saving ? "Confirmando..." : "Confirmar Compra"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detalleCompra && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-receipt me-2"></i>Detalle de Compra
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDetalleCompra(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <strong>Proveedor:</strong>
                    <div>{detalleCompra.compra.proveedor?.nombre || "—"}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Fecha:</strong>
                    <div>
                      {new Date(
                        detalleCompra.compra.fechaCompra,
                      ).toLocaleDateString("es-CL")}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Documento:</strong>
                    <div>{detalleCompra.compra.numeroDocumento}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Estado:</strong>
                    <div>{detalleCompra.compra.estado}</div>
                  </div>
                </div>
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleCompra.detalles.map((d) => (
                      <tr key={d._id}>
                        <td>{d.producto?.nombre || "—"}</td>
                        <td>{d.cantidad}</td>
                        <td>
                          ${Number(d.precioCompra || 0).toLocaleString("es-CL")}
                        </td>
                        <td>
                          ${Number(d.subtotal || 0).toLocaleString("es-CL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-end fw-bold mt-3">
                  Total: $
                  {Number(detalleCompra.compra.total || 0).toLocaleString(
                    "es-CL",
                  )}
                </div>
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

export default Compras;
