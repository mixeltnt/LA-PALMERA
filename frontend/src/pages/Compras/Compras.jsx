import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import compraService from "../../services/compraService";
import providerService from "../../services/providerService";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import { formatRut, validarRut } from "../../utils/validators";

// Función utilitaria para normalizar texto (elimina tildes, mayúsculas y espacios extra)
const normalizeStr = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const emptyLine = {
  producto: "",
  codigo: "",
  nombre: "",
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

const emptyNuevoProveedor = {
  nombre: "",
  rut: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
};

const emptyNuevoProducto = {
  codigo: "",
  codigoBarras: "",
  nombre: "",
  categoria: "",
  precioCompra: "",
  precioVenta: "",
  stockMinimo: 2,
  unidadMedida: "Unidad",
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
  const [categorias, setCategorias] = useState([]);
  const [detalleCompra, setDetalleCompra] = useState(null);

  // Estados para Escáner en Compras
  const [scannerInput, setScannerInput] = useState("");
  const scannerRef = useRef(null);

  // Estados para Modal de Nuevo Proveedor Rápido
  const [showProvModal, setShowProvModal] = useState(false);
  const [provForm, setProvForm] = useState(emptyNuevoProveedor);
  const [savingProv, setSavingProv] = useState(false);
  const [provError, setProvError] = useState("");

  // Estados para Modal de Nuevo Producto Rápido con Detector Anti-Duplicados
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodForm, setProdForm] = useState(emptyNuevoProducto);
  const [savingProd, setSavingProd] = useState(false);
  const [prodError, setProdError] = useState("");
  const [targetLineIndex, setTargetLineIndex] = useState(null);

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

  const recargarCatalogos = useCallback(async () => {
    try {
      const [provs, prodsData, cats] = await Promise.all([
        providerService.listarTodas(),
        productService.listar({ limit: 500 }),
        categoryService.listarTodas(),
      ]);
      setProveedores(provs || []);
      setProductos(prodsData.productos || []);
      setCategorias(cats || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    recargarCatalogos();
  }, [recargarCatalogos]);

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

      if (field === "producto") {
        const prodEncontrado = productos.find((p) => String(p._id || p.id) === String(value));
        if (prodEncontrado) {
          next[index].codigo = prodEncontrado.codigo || "";
          next[index].nombre = prodEncontrado.nombre || "";
          if (!next[index].precioCompra || Number(next[index].precioCompra) === 0) {
            next[index].precioCompra = prodEncontrado.precioCompra || prodEncontrado.precioCosto || "";
          }
        }
      }

      if (field === "cantidad" || field === "precioCompra" || field === "producto") {
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
    setForm((prev) => {
      const next = prev.productos.filter((_, i) => i !== index);
      return {
        ...prev,
        productos: next.length > 0 ? next : [{ ...emptyLine }],
      };
    });
  };

  const calcularTotal = () => {
    return form.productos.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0,
    );
  };

  const processScannedBarcode = (code) => {
    if (!code) return;
    const normCode = normalizeStr(code);
    const prodEncontrado = productos.find(
      (p) =>
        normalizeStr(p.codigo) === normCode ||
        normalizeStr(p.codigoBarras) === normCode,
    );

    if (prodEncontrado) {
      const existingIdx = form.productos.findIndex(
        (line) => String(line.producto) === String(prodEncontrado._id || prodEncontrado.id),
      );

      if (existingIdx >= 0) {
        setForm((prev) => {
          const next = [...prev.productos];
          const cant = Number(next[existingIdx].cantidad || 1) + 1;
          const precio = Number(next[existingIdx].precioCompra || prodEncontrado.precioCompra || 0);
          next[existingIdx] = {
            ...next[existingIdx],
            cantidad: cant,
            subtotal: cant * precio,
          };
          return { ...prev, productos: next };
        });
        setToast({
          type: "info",
          text: `Se incrementó cantidad de "${prodEncontrado.nombre}".`,
        });
      } else {
        const newLine = {
          producto: prodEncontrado._id || prodEncontrado.id,
          codigo: prodEncontrado.codigo,
          nombre: prodEncontrado.nombre,
          cantidad: 1,
          precioCompra: prodEncontrado.precioCompra || "",
          subtotal: Number(prodEncontrado.precioCompra || 0),
        };
        setForm((prev) => {
          const prods = prev.productos.filter((p) => p.producto !== "");
          return { ...prev, productos: [...prods, newLine] };
        });
        setToast({
          type: "success",
          text: `Producto "${prodEncontrado.nombre}" agregado a la compra.`,
        });
      }
    } else {
      setProdForm({
        ...emptyNuevoProducto,
        codigo: code,
        codigoBarras: code,
      });
      setProdError("");
      setTargetLineIndex(null);
      setShowProdModal(true);
      setToast({
        type: "warning",
        text: `Código "${code}" no existe. Formulario abierto para crearlo.`,
      });
    }
  };

  // --- ESCANEO RÁPIDO DE CÓDIGO DE BARRAS EN COMPRAS ---
  const handleScanInput = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = scannerInput.trim();
      processScannedBarcode(code);
      setScannerInput("");
    }
  };

  // --- CREACIÓN RÁPIDA DE PROVEEDOR ---
  const handleCrearProveedor = async (e) => {
    e.preventDefault();
    if (!provForm.nombre.trim()) {
      setProvError("El nombre del proveedor es obligatorio.");
      return;
    }

    if (provForm.rut && provForm.rut.trim() && !validarRut(provForm.rut)) {
      setProvError("El RUT ingresado no es válido (ej: 76.123.456-7).");
      return;
    }

    setSavingProv(true);
    try {
      const res = await providerService.crear(provForm);
      const nuevoProv = res.proveedor;
      await recargarCatalogos();
      setForm((prev) => ({
        ...prev,
        proveedor: nuevoProv._id || nuevoProv.id,
      }));
      setShowProvModal(false);
      setProvForm(emptyNuevoProveedor);
      setProvError("");
      setToast({
        type: "success",
        text: `Proveedor "${nuevoProv.nombre}" creado y seleccionado con éxito.`,
      });
    } catch (err) {
      setProvError(err.message || "Error al crear proveedor.");
    } finally {
      setSavingProv(false);
    }
  };

  // --- DETECCIÓN EN VIVO DE PRODUCTOS SIMILARES / DUPLICADOS ---
  const productoSimilarDetectado = useMemo(() => {
    if (!showProdModal) return null;
    const normNom = normalizeStr(prodForm.nombre);
    const normCod = normalizeStr(prodForm.codigo);
    const normBar = normalizeStr(prodForm.codigoBarras);

    if (normCod) {
      const matchCod = productos.find(
        (p) => normalizeStr(p.codigo) === normCod,
      );
      if (matchCod) return { match: matchCod, motivo: `Código "${prodForm.codigo}" ya registrado` };
    }

    if (normBar) {
      const matchBar = productos.find(
        (p) => normalizeStr(p.codigoBarras) === normBar,
      );
      if (matchBar) return { match: matchBar, motivo: `Código de barras "${prodForm.codigoBarras}" ya registrado` };
    }

    if (normNom && normNom.length >= 3) {
      const matchNom = productos.find((p) => {
        const pNorm = normalizeStr(p.nombre);
        return pNorm === normNom || pNorm.includes(normNom) || normNom.includes(pNorm);
      });
      if (matchNom) return { match: matchNom, motivo: `Nombre muy similar a "${matchNom.nombre}"` };
    }

    return null;
  }, [showProdModal, prodForm.nombre, prodForm.codigo, prodForm.codigoBarras, productos]);

  const seleccionarSimilarExistente = (similar) => {
    const newLine = {
      producto: similar._id || similar.id,
      codigo: similar.codigo,
      nombre: similar.nombre,
      cantidad: 1,
      precioCompra: similar.precioCompra || similar.precioCosto || 0,
      subtotal: similar.precioCompra || similar.precioCosto || 0,
    };

    setForm((prev) => {
      if (targetLineIndex !== null && targetLineIndex < prev.productos.length) {
        const next = [...prev.productos];
        next[targetLineIndex] = newLine;
        return { ...prev, productos: next };
      }
      const clean = prev.productos.filter((l) => l.producto);
      return { ...prev, productos: [...clean, newLine] };
    });

    setShowProdModal(false);
    setProdForm(emptyNuevoProducto);
    setToast({
      type: "info",
      text: `Se seleccionó el producto existente: "${similar.nombre}".`,
    });
  };

  // --- CREACIÓN RÁPIDA DE PRODUCTO EN COMPRA ---
  const handleCrearProducto = async (e) => {
    e.preventDefault();
    if (!prodForm.nombre.trim()) {
      setProdError("El nombre del producto es obligatorio.");
      return;
    }
    if (!prodForm.codigo.trim()) {
      setProdError("El código del producto es obligatorio.");
      return;
    }
    if (!prodForm.precioCompra || Number(prodForm.precioCompra) <= 0) {
      setProdError("El precio de compra debe ser mayor a 0.");
      return;
    }
    if (!prodForm.precioVenta || Number(prodForm.precioVenta) <= 0) {
      setProdError("El precio de venta debe ser mayor a 0.");
      return;
    }

    setSavingProd(true);
    try {
      const res = await productService.crear({
        ...prodForm,
        stockActual: 0, // Se sumará automáticamente con la compra
      });
      const nuevoProd = res.producto;
      await recargarCatalogos();

      const newLine = {
        producto: nuevoProd._id || nuevoProd.id,
        codigo: nuevoProd.codigo,
        nombre: nuevoProd.nombre,
        cantidad: 1,
        precioCompra: Number(prodForm.precioCompra),
        subtotal: Number(prodForm.precioCompra),
      };

      setForm((prev) => {
        if (targetLineIndex !== null && targetLineIndex < prev.productos.length) {
          const next = [...prev.productos];
          next[targetLineIndex] = newLine;
          return { ...prev, productos: next };
        }
        const clean = prev.productos.filter((l) => l.producto);
        return { ...prev, productos: [...clean, newLine] };
      });

      setShowProdModal(false);
      setProdForm(emptyNuevoProducto);
      setProdError("");
      setToast({
        type: "success",
        text: `Producto "${nuevoProd.nombre}" creado y agregado a la compra.`,
      });
    } catch (err) {
      setProdError(err.message || "Error al crear producto.");
    } finally {
      setSavingProd(false);
    }
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
      errores.push("No se permiten productos duplicados en la misma compra.");
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
      const provSeleccionado = proveedores.find(
        (p) => String(p._id || p.id) === String(form.proveedor),
      );

      const payload = {
        ...form,
        proveedorId: form.proveedor,
        proveedorNombre: provSeleccionado?.nombre || "Proveedor",
        numeroFactura: form.numeroDocumento,
        fecha: form.fechaCompra,
        estado: confirmar ? "completada" : "BORRADOR",
        total: calcularTotal(),
        items: form.productos.map((p) => {
          const prodObj = productos.find((item) => String(item._id || item.id) === String(p.producto));
          return {
            productoId: p.producto,
            codigo: p.codigo || prodObj?.codigo || "",
            nombre: p.nombre || prodObj?.nombre || "Producto",
            cantidad: Number(p.cantidad),
            costoUnitario: Number(p.precioCompra),
            subtotal: Number(p.subtotal),
          };
        }),
      };

      if (editingId) {
        await compraService.actualizar(editingId, payload);
        if (confirmar) {
          await compraService.confirmar(editingId);
        }
        setToast({
          type: "success",
          text: confirmar
            ? "Compra confirmada y stock actualizado correctamente."
            : "Compra actualizada correctamente.",
        });
      } else {
        const creada = await compraService.crear(payload);
        if (confirmar) {
          await compraService.confirmar(creada._id || creada.compra?._id);
        }
        setToast({
          type: "success",
          text: confirmar
            ? "¡Compra confirmada! Stock e inventario actualizados con éxito."
            : "Compra guardada como borrador.",
        });
      }
      setShowForm(false);
      setForm({ ...emptyForm, productos: [{ ...emptyLine }] });
      cargar();
      recargarCatalogos();
    } catch (err) {
      const detalle =
        (Array.isArray(err.errores) &&
          err.errores.length &&
          err.errores.join(" ")) ||
        (Array.isArray(err.errors) &&
          err.errors.length &&
          err.errors.join(" ")) ||
        err.message ||
        "Error al guardar la compra.";
      setError(detalle);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-truck text-success me-2"></i>Compras y Abastecimiento
          </h3>
          <p className="text-muted small mb-0">
            Ingreso centralizado de mercadería, facturas, proveedores y productos.
          </p>
        </div>
        <button className="btn btn-success shadow-sm" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>Nueva Compra
        </button>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type} shadow-sm alert-dismissible fade show`} role="alert">
          <i className="bi bi-info-circle-fill me-2"></i>
          {toast.text}
          <button type="button" className="btn-close" onClick={() => setToast(null)}></button>
        </div>
      )}

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
                  placeholder="Buscar por número de documento o proveedor..."
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
                      <th>N° Doc / Folio</th>
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
                      <tr key={c._id || c.id}>
                        <td className="fw-semibold">
                          {c.numeroDocumento || c.numeroFactura || `Folio #${c.folio || c.id}`}
                        </td>
                        <td>
                          {c.fechaCompra || c.fecha
                            ? new Date(c.fechaCompra || c.fecha).toLocaleDateString("es-CL")
                            : "—"}
                        </td>
                        <td>{c.proveedor?.nombre || c.proveedorNombre || "—"}</td>
                        <td>
                          <span
                            className={`badge ${
                              c.estado === "completada" || c.estado === "CONFIRMADA"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {c.estado === "completada" || c.estado === "CONFIRMADA"
                              ? "Confirmada"
                              : c.estado}
                          </span>
                        </td>
                        <td className="text-end fw-bold text-success">
                          ${Number(c.total || 0).toLocaleString("es-CL")}
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary btn-icon"
                            onClick={() => openDetail(c._id || c.id)}
                            title="Ver Detalle"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {compras.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No se encontraron compras registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} compras)
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

      {/* --- MODAL PRINCIPAL: NUEVA COMPRA --- */}
      {showForm && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-truck me-2"></i>
                  {editingId ? "Editar Compra" : "Registrar Nueva Compra"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowForm(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {error && (
                  <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>{error}</div>
                  </div>
                )}

                {/* Cabecera de la Compra */}
                <div className="row g-3 mb-3 bg-light p-3 rounded border">
                  <div className="col-md-5">
                    <label className="form-label small fw-bold">
                      Proveedor *
                    </label>
                    <div className="input-group">
                      <select
                        className="form-select"
                        name="proveedor"
                        value={form.proveedor}
                        onChange={handleChange}
                      >
                        <option value="">-- Seleccione un proveedor --</option>
                        {proveedores.map((prov) => (
                          <option key={prov._id || prov.id} value={prov._id || prov.id}>
                            {prov.nombre} {prov.rut ? `(${prov.rut})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-success fw-semibold"
                        onClick={() => {
                          setProvForm(emptyNuevoProveedor);
                          setProvError("");
                          setShowProvModal(true);
                        }}
                        title="Crear un proveedor nuevo de inmediato"
                      >
                        <i className="bi bi-plus-lg me-1"></i>Nuevo
                      </button>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold">Fecha Compra *</label>
                    <input
                      className="form-control"
                      type="date"
                      name="fechaCompra"
                      value={form.fechaCompra}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">N° Factura / Boleta *</label>
                    <input
                      className="form-control"
                      placeholder="Ej: FAC-12948 o Bol-091"
                      name="numeroDocumento"
                      value={form.numeroDocumento}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small text-muted">Observaciones / Notas de la compra</label>
                    <input
                      className="form-control form-control-sm"
                      name="observaciones"
                      placeholder="Lugar de compra, condiciones, etc."
                      value={form.observaciones}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Barra de Pistoleo / Escaneo Directo de Productos */}
                <div className="card bg-success-subtle border-success border-opacity-25 mb-3">
                  <div className="card-body py-2 px-3">
                    <div className="row align-items-center g-2">
                      <div className="col-md-7">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-white text-success fw-bold">
                            <i className="bi bi-upc-scan me-1"></i> <span className="d-none d-sm-inline">Escanear:</span>
                          </span>
                          <input
                            ref={scannerRef}
                            className="form-control"
                            placeholder="Escanea o escribe el código..."
                            value={scannerInput}
                            onChange={(e) => setScannerInput(e.target.value)}
                            onKeyDown={handleScanInput}
                          />
                        </div>
                      </div>
                      <div className="col-md-5 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-semibold shadow-sm"
                          onClick={() => {
                            setProdForm({ ...emptyNuevoProducto });
                            setProdError("");
                            setTargetLineIndex(null);
                            setShowProdModal(true);
                          }}
                        >
                          <i className="bi bi-plus-circle-fill me-1"></i>+ Crear Nuevo Producto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de Productos de la Compra */}
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "42%" }}>Producto</th>
                        <th style={{ width: "15%" }}>Cantidad</th>
                        <th style={{ width: "20%" }}>Precio Compra ($)</th>
                        <th style={{ width: "18%" }} className="text-end">Subtotal</th>
                        <th style={{ width: "5%" }} className="text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.productos.map((line, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <select
                                className="form-select form-select-sm"
                                value={line.producto}
                                onChange={(e) =>
                                  handleLineChange(index, "producto", e.target.value)
                                }
                              >
                                <option value="">-- Seleccionar producto existente --</option>
                                {productos.map((prod) => (
                                  <option key={prod._id || prod.id} value={prod._id || prod.id}>
                                    {prod.nombre} {prod.codigo ? `[${prod.codigo}]` : ""} — Costo actual: ${Number(prod.precioCompra || prod.precioCosto || 0).toLocaleString("es-CL")}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td>
                            <input
                              className="form-control form-control-sm"
                              type="number"
                              min="1"
                              value={line.cantidad}
                              onChange={(e) =>
                                handleLineChange(index, "cantidad", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text">$</span>
                              <input
                                className="form-control form-control-sm"
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Costo unitario"
                                value={line.precioCompra}
                                onChange={(e) =>
                                  handleLineChange(index, "precioCompra", e.target.value)
                                }
                              />
                            </div>
                          </td>
                          <td className="text-end fw-bold text-dark">
                            ${Number(line.subtotal || 0).toLocaleString("es-CL")}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-0 px-2"
                              onClick={() => removeLine(index)}
                              title="Eliminar fila"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={addLine}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Agregar otra línea
                  </button>
                  <div className="text-end">
                    <span className="text-muted me-2">Total de la Compra:</span>
                    <span className="fs-4 fw-bold text-success">
                      ${calcularTotal().toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
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
                  className="btn btn-success fw-bold px-4 shadow-sm"
                  onClick={() => guardar(true)}
                  disabled={saving}
                >
                  <i className="bi bi-check2-circle me-1"></i>
                  {saving ? "Confirmando..." : "Confirmar Compra"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-MODAL: NUEVO PROVEEDOR RÁPIDO --- */}
      {showProvModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-dark text-white py-2">
                <h6 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill text-success me-2"></i>
                  Crear Proveedor Rápido
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowProvModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCrearProveedor}>
                <div className="modal-body">
                  {provError && (
                    <div className="alert alert-danger py-1 small">{provError}</div>
                  )}
                  <div className="mb-2">
                    <label className="form-label small fw-bold mb-1">Nombre / Razón Social *</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Ej: Distribuidora Los Andes"
                      value={provForm.nombre}
                      onChange={(e) => setProvForm({ ...provForm, nombre: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">RUT</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Ej: 76.123.456-7"
                        value={provForm.rut}
                        onChange={(e) => setProvForm({ ...provForm, rut: formatRut(e.target.value) })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">Teléfono</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="+56 9..."
                        value={provForm.telefono}
                        onChange={(e) => setProvForm({ ...provForm, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small text-muted mb-1">Contacto / Vendedor</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Ej: Juan Pérez"
                      value={provForm.contacto}
                      onChange={(e) => setProvForm({ ...provForm, contacto: e.target.value })}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small text-muted mb-1">Dirección / Ciudad</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Ej: Av. Central #123"
                      value={provForm.direccion}
                      onChange={(e) => setProvForm({ ...provForm, direccion: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowProvModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-success fw-semibold"
                    disabled={savingProv}
                  >
                    {savingProv ? "Guardando..." : "Guardar y Seleccionar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-MODAL: NUEVO PRODUCTO RÁPIDO CON DETECTOR ANTI-DUPLICADOS --- */}
      {showProdModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-dark text-white py-2">
                <h6 className="modal-title fw-bold">
                  <i className="bi bi-box-seam-fill text-success me-2"></i>
                  Crear Producto Nuevo para Compra
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowProdModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCrearProducto}>
                <div className="modal-body">
                  {prodError && (
                    <div className="alert alert-danger py-1 small">{prodError}</div>
                  )}

                  {/* ALERTA INTELIGENTE EN VIVO: Si ya existe un producto similar */}
                  {productoSimilarDetectado && (
                    <div className="alert alert-warning border-warning d-flex align-items-center justify-content-between p-2 mb-3">
                      <div>
                        <div className="fw-bold small text-dark">
                          <i className="bi bi-lightbulb-fill text-warning me-1"></i>
                          {productoSimilarDetectado.motivo}
                        </div>
                        <div className="small text-muted">
                          Producto existente: <strong>{productoSimilarDetectado.match.nombre}</strong> (Código: {productoSimilarDetectado.match.codigo})
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-warning text-dark fw-bold"
                        onClick={() => seleccionarSimilarExistente(productoSimilarDetectado.match)}
                      >
                        <i className="bi bi-check-circle-fill me-1"></i>Usar Existente
                      </button>
                    </div>
                  )}

                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold mb-1">Código del Producto *</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Ej: 780123456789 o PROD-01"
                        value={prodForm.codigo}
                        onChange={(e) => setProdForm({ ...prodForm, codigo: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold mb-1">Código de Barras</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="Opcional si es igual al código"
                        value={prodForm.codigoBarras}
                        onChange={(e) => setProdForm({ ...prodForm, codigoBarras: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold mb-1">Nombre del Producto *</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Ej: Leche Entera 1L Soprole"
                      value={prodForm.nombre}
                      onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold mb-1">Categoría</label>
                      <select
                        className="form-select form-select-sm"
                        value={prodForm.categoria}
                        onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}
                      >
                        <option value="">-- Sin categoría --</option>
                        {categorias.map((c) => (
                          <option key={c.id || c._id} value={c.id || c._id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold mb-1">Unidad de Medida</label>
                      <select
                        className="form-select form-select-sm"
                        value={prodForm.unidadMedida}
                        onChange={(e) => setProdForm({ ...prodForm, unidadMedida: e.target.value })}
                      >
                        <option value="Unidad">Unidad (un)</option>
                        <option value="Kilogramo">Kilogramo (kg)</option>
                        <option value="Litro">Litro (lt)</option>
                        <option value="Pack">Pack / Caja</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-2 mb-2 bg-light p-2 rounded border">
                    <div className="col-md-4">
                      <label className="form-label small fw-bold mb-1 text-danger">Precio Compra (Costo) *</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input
                          className="form-control form-control-sm"
                          type="number"
                          min="1"
                          placeholder="Ej: 800"
                          value={prodForm.precioCompra}
                          onChange={(e) => setProdForm({ ...prodForm, precioCompra: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold mb-1 text-success">Precio Venta Sugerido *</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input
                          className="form-control form-control-sm"
                          type="number"
                          min="1"
                          placeholder="Ej: 1100"
                          value={prodForm.precioVenta}
                          onChange={(e) => setProdForm({ ...prodForm, precioVenta: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold mb-1 text-muted">Stock Mínimo</label>
                      <input
                        className="form-control form-control-sm"
                        type="number"
                        min="0"
                        value={prodForm.stockMinimo}
                        onChange={(e) => setProdForm({ ...prodForm, stockMinimo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowProdModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-success fw-semibold"
                    disabled={savingProd}
                  >
                    {savingProd ? "Guardando..." : "Crear y Añadir a Compra"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DETALLE DE COMPRA --- */}
      {detalleCompra && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-receipt me-2"></i>Detalle de Compra #{detalleCompra.compra?.numeroCompra || detalleCompra.compra?.id}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDetalleCompra(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-3 p-3 bg-light rounded border">
                  <div className="col-md-4">
                    <small className="text-muted d-block">Proveedor</small>
                    <strong>{detalleCompra.compra?.proveedor?.nombre || detalleCompra.compra?.proveedorNombre || "—"}</strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">Fecha de Compra</small>
                    <strong>
                      {detalleCompra.compra?.fecha
                        ? new Date(detalleCompra.compra.fecha).toLocaleDateString("es-CL")
                        : "—"}
                    </strong>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted d-block">N° Factura / Documento</small>
                    <strong>{detalleCompra.compra?.numeroFactura || detalleCompra.compra?.numeroDocumento || "—"}</strong>
                  </div>
                </div>

                <h6 className="fw-bold mb-2">Productos Comprados:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th className="text-center">Cantidad</th>
                        <th className="text-end">Costo Unit.</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detalleCompra.compra?.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="fw-semibold">{it.nombre}</td>
                          <td className="text-muted small">{it.codigo || "—"}</td>
                          <td className="text-center">{it.cantidad}</td>
                          <td className="text-end">${Number(it.costoUnitario || 0).toLocaleString("es-CL")}</td>
                          <td className="text-end fw-bold">${Number(it.subtotal || 0).toLocaleString("es-CL")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-end mt-3">
                  <span className="text-muted me-2">Total Pagado:</span>
                  <span className="fs-4 fw-bold text-success">
                    ${Number(detalleCompra.compra?.total || 0).toLocaleString("es-CL")}
                  </span>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDetalleCompra(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compras;
