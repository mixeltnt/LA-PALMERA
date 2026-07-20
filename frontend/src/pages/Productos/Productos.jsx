import { useCallback, useEffect, useState } from "react";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import providerService from "../../services/providerService";

const emptyForm = {
  codigo: "",
  codigoBarras: "",
  nombre: "",
  descripcion: "",
  marca: "",
  categoria: "",
  proveedorPrincipal: "",
  precioCompra: "",
  precioVenta: "",
  stockActual: "",
  stockMinimo: "",
  unidadMedida: "Unidad",
  imagen: "",
  activo: true,
};

function Productos() {
  const [productos, setProductos] = useState([]);
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
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    categoryService
      .listarTodas()
      .then(setCategorias)
      .catch(() => {});

    providerService
      .listarTodas()
      .then(setProveedores)
      .catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const params = { page, limit: 10 };
    if (search) params.search = search;
    if (filtro === "activos") params.activo = "true";
    if (filtro === "stockBajo") params.stockBajo = "true";
    return params;
  }, [search, filtro, page]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.listar(buildParams());
      setProductos(data.productos);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargar();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [cargar]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  const openEdit = (producto) => {
    setEditing(producto);
    setForm({
      codigo: producto.codigo || "",
      codigoBarras: producto.codigoBarras || "",
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      marca: producto.marca || "",
      categoria: producto.categoria?._id || producto.categoria || "",
      proveedorPrincipal:
        producto.proveedorPrincipal?._id || producto.proveedorPrincipal || "",
      precioCompra: producto.precioCompra ?? "",
      precioVenta: producto.precioVenta ?? "",
      stockActual: producto.stockActual ?? "",
      stockMinimo: producto.stockMinimo ?? "",
      unidadMedida: producto.unidadMedida || "Unidad",
      imagen: producto.imagen || "",
      activo: producto.activo !== undefined ? producto.activo : true,
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
    if (!form.codigo.trim())
      errores.push("El código del producto es obligatorio.");
    if (!form.nombre.trim())
      errores.push("El nombre del producto es obligatorio.");
    if (!form.precioCompra || Number(form.precioCompra) <= 0)
      errores.push("El precio de compra debe ser mayor a 0.");
    if (!form.precioVenta || Number(form.precioVenta) <= 0)
      errores.push("El precio de venta debe ser mayor a 0.");
    if (form.stockActual === "" || Number(form.stockActual) < 0)
      errores.push("El stock actual no puede ser negativo.");
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
      const payload = {
        ...form,
        stockActual: form.stockActual,
      };

      if (editing) {
        await productService.actualizar(editing._id, payload);
        setToast({
          type: "success",
          text: "Producto actualizado correctamente.",
        });
      } else {
        await productService.crear(payload);
        setToast({ type: "success", text: "Producto creado correctamente." });
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      setError(err.message || "Error al guardar producto.");
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
      await productService.eliminar(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setToast({ type: "success", text: "Producto eliminado correctamente." });
      cargar();
    } catch {
      // silent
    }
  };

  const formatPrice = (val) => {
    const n = Number(val);
    return Number.isNaN(n) ? "$0" : `$${n.toLocaleString("es-CL")}`;
  };

  const getStockBadge = (stock, stockMinimo) => {
    if (stock <= stockMinimo) {
      return <span className="badge bg-danger">Stock Bajo</span>;
    }
    if (stock === 0) {
      return <span className="badge bg-secondary">Agotado</span>;
    }
    return <span className="badge bg-success">{stock}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Productos</h3>
          <p className="text-muted small mb-0">
            Gestión de productos y stock. Total: {total}
          </p>
        </div>
        <button className="btn btn-success" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo Producto
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
                  placeholder="Buscar por código, nombre, categoría o marca..."
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
                <option value="stockBajo">Stock Bajo</option>
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
                      <th style={{ width: 60 }}>Imagen</th>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Proveedor</th>
                      <th className="text-end">P. Compra</th>
                      <th className="text-end">P. Venta</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center">Stk. Mín</th>
                      <th>Estado</th>
                      <th className="text-center" style={{ width: 100 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p) => (
                      <tr key={p._id}>
                        <td>
                          {p.imagen ? (
                            <img
                              src={p.imagen}
                              alt={p.nombre}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                              }}
                              className="rounded"
                            />
                          ) : (
                            <div
                              className="d-flex align-items-center justify-content-center rounded bg-light text-secondary"
                              style={{ width: 40, height: 40 }}
                            >
                              <i className="bi bi-image"></i>
                            </div>
                          )}
                        </td>
                        <td className="fw-semibold">{p.codigo || "—"}</td>
                        <td className="fw-semibold">{p.nombre}</td>
                        <td>
                          {p.categoria?.nombre ||
                            p.categoriaNombre ||
                            p.categoria ||
                            "—"}
                        </td>
                        <td>{p.proveedorPrincipal?.nombre || "—"}</td>
                        <td className="text-end">
                          {formatPrice(p.precioCompra)}
                        </td>
                        <td className="text-end fw-semibold">
                          {formatPrice(p.precioVenta)}
                        </td>
                        <td className="text-center">
                          {getStockBadge(p.stockActual, p.stockMinimo)}
                        </td>
                        <td className="text-center">{p.stockMinimo}</td>
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
                    {productos.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="text-center text-muted py-4"
                        >
                          No se encontraron productos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} productos)
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
                  {editing ? "Editar Producto" : "Nuevo Producto"}
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
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Código *
                      </label>
                      <input
                        className="form-control"
                        name="codigo"
                        value={form.codigo}
                        onChange={handleFormChange}
                        required
                        placeholder="Ej: PROD-001"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Nombre *
                      </label>
                      <input
                        className="form-control"
                        name="nombre"
                        value={form.nombre}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Código de Barras
                      </label>
                      <input
                        className="form-control"
                        name="codigoBarras"
                        value={form.codigoBarras}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        Descripción
                      </label>
                      <textarea
                        className="form-control"
                        name="descripcion"
                        rows={2}
                        value={form.descripcion}
                        onChange={handleFormChange}
                      ></textarea>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Categoría
                      </label>
                      <select
                        className="form-select"
                        name="categoria"
                        value={form.categoria}
                        onChange={handleFormChange}
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Proveedor principal
                      </label>
                      <select
                        className="form-select"
                        name="proveedorPrincipal"
                        value={form.proveedorPrincipal}
                        onChange={handleFormChange}
                      >
                        <option value="">Sin proveedor</option>
                        {proveedores.map((prov) => (
                          <option key={prov._id} value={prov._id}>
                            {prov.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Marca
                      </label>
                      <input
                        className="form-control"
                        name="marca"
                        value={form.marca}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Unidad de Medida
                      </label>
                      <select
                        className="form-select"
                        name="unidadMedida"
                        value={form.unidadMedida}
                        onChange={handleFormChange}
                      >
                        <option value="Unidad">Unidad</option>
                        <option value="Kg">Kg</option>
                        <option value="Litro">Litro</option>
                        <option value="Gramo">Gramo</option>
                        <option value="Paquete">Paquete</option>
                        <option value="Caja">Caja</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Precio Compra *
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="0.01"
                          name="precioCompra"
                          value={form.precioCompra}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Precio Venta *
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="0.01"
                          name="precioVenta"
                          value={form.precioVenta}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-semibold">
                        Stock *
                      </label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        name="stockActual"
                        value={form.stockActual}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small fw-semibold">
                        Stock Mínimo
                      </label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        name="stockMinimo"
                        value={form.stockMinimo}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">
                        Imagen (URL)
                      </label>
                      <input
                        className="form-control"
                        name="imagen"
                        value={form.imagen}
                        onChange={handleFormChange}
                        placeholder="https://..."
                      />
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
                          Producto activo
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
                        {editing ? "Actualizar" : "Crear"} Producto
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
                  ¿Estás seguro de eliminar este producto?
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

export default Productos;
