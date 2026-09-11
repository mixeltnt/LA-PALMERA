import { useCallback, useEffect, useMemo, useState } from "react";
import productService from "../../services/productService";

function Inventario() {
  const [tabActiva, setTabActiva] = useState("stock"); // 'stock' | 'kardex'

  // Estado Stock
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");

  // Estado Kardex
  const [kardexList, setKardexList] = useState([]);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [filtroKardexProducto, setFiltroKardexProducto] = useState("");
  const [kardexFechaDesde, setKardexFechaDesde] = useState("");
  const [kardexFechaHasta, setKardexFechaHasta] = useState("");

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await productService.listar({ limit: 100, activo: "true" });
      setProductos(Array.isArray(data.productos) ? data.productos : []);
    } catch (err) {
      setProductos([]);
      setError(err?.message || "No fue posible cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarKardex = useCallback(async () => {
    setLoadingKardex(true);
    try {
      const params = {};
      if (filtroKardexProducto) params.productoId = filtroKardexProducto;
      if (kardexFechaDesde) params.fechaDesde = kardexFechaDesde;
      if (kardexFechaHasta) params.fechaHasta = kardexFechaHasta;

      const data = await productService.kardex(params);
      setKardexList(data.movimientos || []);
    } catch (err) {
      console.error("Error cargando kardex:", err);
      setKardexList([]);
    } finally {
      setLoadingKardex(false);
    }
  }, [filtroKardexProducto, kardexFechaDesde, kardexFechaHasta]);

  useEffect(() => {
    void cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    if (tabActiva === "kardex") {
      void cargarKardex();
    }
  }, [tabActiva, cargarKardex]);

  const categorias = useMemo(() => {
    const valores = productos
      .map(
        (producto) =>
          producto.categoria?.nombre ||
          producto.categoriaNombre ||
          producto.categoria,
      )
      .filter(Boolean);

    return [...new Set(valores)].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const texto = search.trim().toLowerCase();

    return productos.filter((producto) => {
      const codigo = String(producto.codigo || "").toLowerCase();
      const nombre = String(producto.nombre || "").toLowerCase();
      const categoriaNombre =
        producto.categoria?.nombre ||
        producto.categoriaNombre ||
        producto.categoria ||
        "";

      const coincideBusqueda =
        !texto || codigo.includes(texto) || nombre.includes(texto);
      const coincideCategoria =
        categoria === "todas" || categoriaNombre === categoria;

      return coincideBusqueda && coincideCategoria;
    });
  }, [categoria, productos, search]);

  const resumen = useMemo(() => {
    return productosFiltrados.reduce(
      (acc, producto) => {
        const stockActual = Number(producto.stockActual) || 0;
        const stockMinimo = Number(producto.stockMinimo) || 0;

        acc.total += 1;

        if (stockActual === 0) {
          acc.sinStock += 1;
        } else if (stockActual <= stockMinimo) {
          acc.stockBajo += 1;
        } else {
          acc.stockNormal += 1;
        }

        return acc;
      },
      { total: 0, stockNormal: 0, stockBajo: 0, sinStock: 0 },
    );
  }, [productosFiltrados]);

  const formatPrice = useCallback((value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  }, []);

  const formatFechaHora = (value) => {
    try {
      return new Date(value).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value || "—";
    }
  };

  const getStockState = useCallback((stockActual, stockMinimo) => {
    const stock = Number(stockActual) || 0;
    const minimo = Number(stockMinimo) || 0;

    if (stock === 0) {
      return { label: "SIN STOCK", className: "bg-danger" };
    }

    if (stock <= minimo) {
      return { label: "STOCK BAJO", className: "bg-warning text-dark" };
    }

    return { label: "STOCK NORMAL", className: "bg-success" };
  }, []);

  const getKardexBadge = (tipo) => {
    switch (tipo) {
      case "entrada_compra":
        return { label: "ENTRADA (COMPRA)", className: "bg-success" };
      case "salida_venta":
        return { label: "SALIDA (VENTA)", className: "bg-primary" };
      case "entrada_anulacion":
        return { label: "ENTRADA (ANULACIÓN)", className: "bg-info text-dark" };
      case "ajuste_manual":
        return { label: "AJUSTE MANUAL", className: "bg-warning text-dark" };
      default:
        return { label: (tipo || "MOVIMIENTO").toUpperCase(), className: "bg-secondary" };
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-success mb-2">Inventario y Kardex</h2>
          <p className="text-muted mb-0">
            Control de existencias físicas, stock en tiempo real y trazabilidad de movimientos.
          </p>
        </div>

        <div className="d-flex gap-2">
          <div className="btn-group">
            <button
              className={`btn ${tabActiva === "stock" ? "btn-success" : "btn-outline-success"}`}
              onClick={() => setTabActiva("stock")}
            >
              <i className="bi bi-box-seam me-1"></i> Stock de Productos
            </button>
            <button
              className={`btn ${tabActiva === "kardex" ? "btn-success" : "btn-outline-success"}`}
              onClick={() => setTabActiva("kardex")}
            >
              <i className="bi bi-arrow-left-right me-1"></i> Kardex de Movimientos
            </button>
          </div>

          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              if (tabActiva === "stock") cargarProductos();
              else cargarKardex();
            }}
            disabled={loading || loadingKardex}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {tabActiva === "stock" ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body">
                  <p className="text-muted small mb-1">Total de productos</p>
                  <h3 className="fw-bold mb-0">{resumen.total}</h3>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body">
                  <p className="text-muted small mb-1">Stock normal</p>
                  <h3 className="fw-bold mb-0 text-success">
                    {resumen.stockNormal}
                  </h3>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body">
                  <p className="text-muted small mb-1">Stock bajo</p>
                  <h3 className="fw-bold mb-0 text-warning">{resumen.stockBajo}</h3>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-body">
                  <p className="text-muted small mb-1">Sin stock</p>
                  <h3 className="fw-bold mb-0 text-danger">{resumen.sinStock}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-7">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      className="form-control"
                      placeholder="Buscar por nombre o código..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-5">
                  <select
                    className="form-select"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={categorias.length === 0}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="alert alert-danger shadow-sm" role="alert">
              <strong>No fue posible cargar el inventario.</strong> {error}
            </div>
          ) : null}

          <div className="card shadow-sm border-0">
            <div className="card-body p-0">
              {loading ? (
                <div className="p-4 text-center text-muted">
                  <div
                    className="spinner-border text-success mb-3"
                    role="status"
                    aria-hidden="true"
                  ></div>
                  <div>Cargando productos...</div>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                  <p className="mb-0">
                    No hay productos registrados en el inventario.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th className="text-center">Stock actual</th>
                        <th className="text-center">Stock mínimo</th>
                        <th className="text-end">Precio costo</th>
                        <th className="text-end">Precio venta</th>
                        <th className="text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.map((producto) => {
                        const categoriaNombre =
                          producto.categoria?.nombre ||
                          producto.categoriaNombre ||
                          producto.categoria ||
                          "—";
                        const stockActual = Number(producto.stockActual) || 0;
                        const stockMinimo = Number(producto.stockMinimo) || 0;
                        const estado = getStockState(stockActual, stockMinimo);

                        return (
                          <tr key={producto._id || producto.id}>
                            <td className="fw-semibold">
                              {producto.codigo || "—"}
                            </td>
                            <td className="fw-semibold">
                              {producto.nombre || "—"}
                            </td>
                            <td>{categoriaNombre}</td>
                            <td className="text-center fw-bold">{stockActual}</td>
                            <td className="text-center text-muted">{stockMinimo}</td>
                            <td className="text-end">
                              {formatPrice(producto.precioCompra || producto.precioCosto)}
                            </td>
                            <td className="text-end">
                              {formatPrice(producto.precioVenta)}
                            </td>
                            <td className="text-center">
                              <span className={`badge ${estado.className}`}>
                                {estado.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* VISTA DE KARDEX */
        <>
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label small text-muted">Filtrar por Producto</label>
                  <select
                    className="form-select"
                    value={filtroKardexProducto}
                    onChange={(e) => setFiltroKardexProducto(e.target.value)}
                  >
                    <option value="">Todos los productos</option>
                    {productos.map((p) => (
                      <option key={p._id || p.id} value={p.id || p._id}>
                        {p.codigo ? `[${p.codigo}] ` : ""}{p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small text-muted">Fecha Desde</label>
                  <input
                    type="date"
                    className="form-control"
                    value={kardexFechaDesde}
                    onChange={(e) => setKardexFechaDesde(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small text-muted">Fecha Hasta</label>
                  <input
                    type="date"
                    className="form-control"
                    value={kardexFechaHasta}
                    onChange={(e) => setKardexFechaHasta(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-primary w-100"
                    onClick={cargarKardex}
                    disabled={loadingKardex}
                  >
                    <i className="bi bi-funnel me-1"></i> Filtrar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-clock-history me-2"></i>Historial de Movimientos de Inventario (Kardex)
              </h5>
            </div>
            <div className="card-body p-0">
              {loadingKardex ? (
                <div className="p-4 text-center text-muted">
                  <div className="spinner-border text-success mb-2" role="status"></div>
                  <div>Consultando movimientos Kardex...</div>
                </div>
              ) : kardexList.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                  <p className="mb-0">
                    No hay movimientos de inventario registrados.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Fecha y Hora</th>
                        <th>Producto</th>
                        <th>Tipo de Movimiento</th>
                        <th>Motivo / Referencia</th>
                        <th className="text-center">Stock Ant.</th>
                        <th className="text-center">Cantidad</th>
                        <th className="text-center">Stock Nuevo</th>
                        <th>Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kardexList.map((m) => {
                        const badge = getKardexBadge(m.tipo);
                        const esEntrada = m.tipo.startsWith("entrada");
                        return (
                          <tr key={m.id}>
                            <td className="small">{formatFechaHora(m.fecha)}</td>
                            <td className="fw-semibold">{m.productoNombre || `Producto #${m.productoId}`}</td>
                            <td>
                              <span className={`badge ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="text-muted small">{m.motivo || "—"}</td>
                            <td className="text-center text-muted">{m.stockAnterior}</td>
                            <td
                              className={`text-center fw-bold ${
                                esEntrada ? "text-success" : "text-danger"
                              }`}
                            >
                              {esEntrada ? "+" : "-"}
                              {m.cantidad}
                            </td>
                            <td className="text-center fw-bold">{m.stockNuevo}</td>
                            <td className="small">{m.usuarioNombre || "Sistema"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Inventario;
