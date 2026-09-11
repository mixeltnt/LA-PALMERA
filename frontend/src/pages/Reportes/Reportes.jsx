import { useCallback, useEffect, useMemo, useState } from "react";
import ventaService from "../../services/ventaService";
import compraService from "../../services/compraService";

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "DEBITO", label: "Débito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "FIADO", label: "Fiado" },
];

const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "7dias", label: "Últimos 7 días" },
  { value: "mes", label: "Este mes" },
  { value: "rango", label: "Rango personalizado" },
];

const formatMoney = (value) => {
  const numeric = Number(value) || 0;
  return `$${numeric.toLocaleString("es-CL")}`;
};

const toISODate = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

const formatFecha = (value) => {
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

function Reportes() {
  const [activeMainTab, setActiveMainTab] = useState("ventas"); // "ventas" | "comparativa"

  // Estados Reporte de Ventas
  const [periodo, setPeriodo] = useState("hoy");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Estados Comparativa de Proveedores
  const [comparativa, setComparativa] = useState([]);
  const [loadingComparativa, setLoadingComparativa] = useState(false);
  const [searchComp, setSearchComp] = useState("");
  const [filtroSoloAhorro, setFiltroSoloAhorro] = useState(false);

  const rango = useMemo(() => {
    const hoy = new Date();
    switch (periodo) {
      case "hoy": {
        const iso = toISODate(hoy);
        return { desde: iso, hasta: iso };
      }
      case "7dias":
        return {
          desde: toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6)),
          hasta: toISODate(hoy),
        };
      case "mes":
        return {
          desde: toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
          hasta: toISODate(hoy),
        };
      case "rango":
        return { desde, hasta };
      default:
        return { desde: "", hasta: "" };
    }
  }, [periodo, desde, hasta]);

  const rangoValido =
    periodo !== "rango" || (Boolean(desde) && Boolean(hasta) && desde <= hasta);

  const cargarVentas = useCallback(async () => {
    if (!rangoValido) return;
    setLoading(true);
    setError("");
    try {
      const paramsEstadisticas = {};
      if (rango.desde) paramsEstadisticas.desde = rango.desde;
      if (rango.hasta) paramsEstadisticas.hasta = rango.hasta;
      if (metodoPago) paramsEstadisticas.metodoPago = metodoPago;

      const [estadisticas, masVendidos, serie] = await Promise.all([
        ventaService.estadisticas(paramsEstadisticas),
        ventaService.productosMasVendidos({ desde: rango.desde, hasta: rango.hasta }),
        ventaService.serie({ dias: 7 }),
      ]);

      setData({ estadisticas, masVendidos: masVendidos.productos || [], serie: serie.serie || [] });
    } catch (err) {
      setError(err.message || "Error al cargar los reportes de ventas.");
    } finally {
      setLoading(false);
    }
  }, [rango, rangoValido, metodoPago]);

  const cargarComparativa = useCallback(async () => {
    setLoadingComparativa(true);
    try {
      const compData = await compraService.comparativaPreciosProveedores();
      setComparativa(compData || []);
    } catch (e) {
      console.error("Error cargando comparativa de proveedores:", e);
      setComparativa([]);
    } finally {
      setLoadingComparativa(false);
    }
  }, []);

  useEffect(() => {
    if (activeMainTab === "ventas") {
      cargarVentas();
    } else if (activeMainTab === "comparativa") {
      cargarComparativa();
    }
  }, [activeMainTab, cargarVentas, cargarComparativa]);

  const resumen = data?.estadisticas?.resumen;
  const porMetodoPago = data?.estadisticas?.porMetodoPago || [];
  const totalMetodo = porMetodoPago.reduce((suma, grupo) => suma + grupo.monto, 0);

  // Filtrado de la comparativa de proveedores
  const comparativaFiltrada = useMemo(() => {
    return comparativa.filter((item) => {
      const matchSearch =
        !searchComp ||
        item.nombre.toLowerCase().includes(searchComp.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchComp.toLowerCase()) ||
        item.mejorProveedor.toLowerCase().includes(searchComp.toLowerCase());

      const matchAhorro = !filtroSoloAhorro || item.tieneMultipleOpcion;
      return matchSearch && matchAhorro;
    });
  }, [comparativa, searchComp, filtroSoloAhorro]);

  // Resumen ejecutivo de la comparativa
  const statsComparativa = useMemo(() => {
    let mayorAhorro = 0;
    let prodMayorAhorro = null;
    let totalMultiprovedor = 0;

    for (const item of comparativa) {
      if (item.tieneMultipleOpcion) {
        totalMultiprovedor++;
        if (item.ahorroMonto > mayorAhorro) {
          mayorAhorro = item.ahorroMonto;
          prodMayorAhorro = item;
        }
      }
    }
    return {
      mayorAhorro,
      prodMayorAhorro,
      totalMultiprovedor,
      totalProductos: comparativa.length,
    };
  }, [comparativa]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-bar-chart-fill text-success me-2"></i>Reportes y Analítica
          </h3>
          <p className="text-muted small mb-0">
            Estadísticas comerciales, flujo de caja y comparativas de precios de proveedores.
          </p>
        </div>
      </div>

      {/* Selector de Pestaña Principal */}
      <ul className="nav nav-pills mb-4 gap-2 bg-light p-2 rounded border">
        <li className="nav-item">
          <button
            className={`btn btn-sm fw-bold px-3 py-2 ${
              activeMainTab === "ventas"
                ? "btn-success shadow-sm"
                : "btn-outline-secondary border-0 text-dark"
            }`}
            onClick={() => setActiveMainTab("ventas")}
          >
            <i className="bi bi-graph-up-arrow me-2"></i>
            Reporte de Ventas y Finanzas
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`btn btn-sm fw-bold px-3 py-2 ${
              activeMainTab === "comparativa"
                ? "btn-success shadow-sm"
                : "btn-outline-secondary border-0 text-dark"
            }`}
            onClick={() => setActiveMainTab("comparativa")}
          >
            <i className="bi bi-tags-fill me-2"></i>
            ⭐ Comparativa de Proveedores (Mejor Precio)
          </button>
        </li>
      </ul>

      {/* --- PESTAÑA 1: REPORTES DE VENTAS --- */}
      {activeMainTab === "ventas" && (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-8">
                  <label className="form-label small text-muted">Período</label>
                  <div className="d-flex flex-wrap gap-2">
                    {PERIODOS.map((opcion) => (
                      <button
                        key={opcion.value}
                        type="button"
                        className={`btn btn-sm ${periodo === opcion.value ? "btn-success" : "btn-outline-success"}`}
                        onClick={() => setPeriodo(opcion.value)}
                      >
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-muted">Método de pago</label>
                  <select
                    className="form-select"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="">Todos los métodos</option>
                    {METODOS_PAGO.map((metodo) => (
                      <option key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </option>
                    ))}
                  </select>
                </div>
                {periodo === "rango" && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Desde</label>
                      <input
                        type="date"
                        className="form-control"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Hasta</label>
                      <input
                        type="date"
                        className="form-control"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="text-muted small">Total Ventas</div>
                      <div className="fs-3 fw-bold text-success">
                        {formatMoney(resumen?.totalMonto ?? resumen?.totalVendido ?? 0)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="text-muted small">Transacciones</div>
                      <div className="fs-3 fw-bold">{resumen?.totalVentas ?? 0}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="text-muted small">Ticket Promedio</div>
                      <div className="fs-3 fw-bold text-primary">
                        {formatMoney(resumen?.ticketPromedio ?? 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-lg-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <h5 className="card-title fw-bold mb-3">Ventas por Método de Pago</h5>
                      {porMetodoPago.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          No hay datos para el período seleccionado.
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {porMetodoPago.map((grupo) => {
                            const porcentaje = totalMetodo > 0 ? (grupo.monto / totalMetodo) * 100 : 0;
                            const key = String(grupo.metodoKey || grupo.metodo).toUpperCase();
                            const barColor =
                              key.includes("EFECTIVO") ? "bg-success" :
                              key.includes("DEBITO") ? "bg-primary" :
                              key.includes("TRANSF") ? "bg-info" :
                              key.includes("FIADO") ? "bg-danger" : "bg-secondary";

                            return (
                              <div key={grupo.metodo}>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span className="fw-semibold">{grupo.metodo} ({grupo.cantidad} venta{grupo.cantidad === 1 ? "" : "s"})</span>
                                  <span className="fw-bold">{formatMoney(grupo.monto)}</span>
                                </div>
                                <div className="progress" style={{ height: 8 }}>
                                  <div
                                    className={`progress-bar ${barColor}`}
                                    role="progressbar"
                                    style={{ width: `${porcentaje}%` }}
                                    aria-valuenow={porcentaje}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <h5 className="card-title fw-bold mb-3">Productos Más Vendidos</h5>
                      {data?.masVendidos?.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          No hay productos vendidos en el período seleccionado.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0 small">
                            <thead className="table-light">
                              <tr>
                                <th>Producto</th>
                                <th className="text-end">Cantidad</th>
                                <th className="text-end">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data?.masVendidos?.map((producto) => (
                                <tr key={producto._id || producto.codigo}>
                                  <td>
                                    <div className="fw-semibold">{producto.nombre}</div>
                                    <div className="text-muted small">{producto.codigo}</div>
                                  </td>
                                  <td className="text-end">{producto.cantidad}</td>
                                  <td className="text-end fw-bold">
                                    {formatMoney(producto.total)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* --- PESTAÑA 2: COMPARATIVA DE PRECIOS POR PROVEEDOR --- */}
      {activeMainTab === "comparativa" && (
        <div>
          {/* Tarjetas KPI de Comparativa y Ahorro */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm bg-success text-white">
                <div className="card-body">
                  <div className="small text-white-50">Mayor Ahorro Identificado</div>
                  <div className="fs-3 fw-bold">
                    {formatMoney(statsComparativa.mayorAhorro)}
                  </div>
                  {statsComparativa.prodMayorAhorro && (
                    <div className="small text-white-50 text-truncate mt-1">
                      En: <strong>{statsComparativa.prodMayorAhorro.nombre}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Productos con Múltiples Proveedores</div>
                  <div className="fs-3 fw-bold text-dark">
                    {statsComparativa.totalMultiprovedor} / {statsComparativa.totalProductos}
                  </div>
                  <div className="small text-muted mt-1">
                    Productos comprados en distintos locales
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Recomendación Estratégica</div>
                  <div className="fs-6 fw-bold text-success mt-1">
                    <i className="bi bi-shield-check me-1"></i>Precios Optimizados
                  </div>
                  <div className="small text-muted">
                    Elige el proveedor con la insignia ⭐ para maximizar tu ganancia
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros de la Comparativa */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-center">
                <div className="col-md-7">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      className="form-control"
                      placeholder="Buscar producto por nombre, código o proveedor más barato..."
                      value={searchComp}
                      onChange={(e) => setSearchComp(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-5">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="switchSoloMultiples"
                      checked={filtroSoloAhorro}
                      onChange={(e) => setFiltroSoloAhorro(e.target.checked)}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="switchSoloMultiples">
                      Mostrar solo productos con más de 1 proveedor (con opción de ahorro)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Comparativa */}
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              {loadingComparativa ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Calculando comparativa...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "25%" }}>Producto</th>
                        <th style={{ width: "25%" }}>Proveedor Más Conveniente ⭐</th>
                        <th style={{ width: "35%" }}>Comparativa de Precios por Proveedor</th>
                        <th style={{ width: "15%" }} className="text-end">Ahorro Potencial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparativaFiltrada.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="fw-bold text-dark">{item.nombre}</div>
                            {item.codigo && <div className="text-muted small">Cód: {item.codigo}</div>}
                          </td>
                          <td>
                            <div className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 text-wrap text-start">
                              <i className="bi bi-star-fill text-warning me-1"></i>
                              <strong>{item.mejorProveedor}</strong>
                              <div className="fw-bold fs-6 mt-1">
                                {formatMoney(item.precioMasBajo)}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {item.proveedores.map((prov, pIdx) => {
                                const esElMasBarato = (prov.ultimoPrecio || prov.menorPrecio) === item.precioMasBajo;
                                return (
                                  <span
                                    key={pIdx}
                                    className={`badge ${
                                      esElMasBarato
                                        ? "bg-success text-white shadow-sm"
                                        : "bg-light text-dark border"
                                    } p-2 text-start`}
                                  >
                                    <div className="fw-bold text-truncate" style={{ maxWidth: 180 }}>
                                      {prov.proveedorNombre}
                                    </div>
                                    <div className="small">
                                      Costo: <strong>{formatMoney(prov.ultimoPrecio || prov.menorPrecio)}</strong>
                                    </div>
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="text-end">
                            {item.tieneMultipleOpcion && item.ahorroMonto > 0 ? (
                              <div>
                                <span className="badge bg-success fs-7 px-2 py-1">
                                  Ahorras {formatMoney(item.ahorroMonto)}
                                </span>
                                <div className="text-muted small mt-1">
                                  ({item.porcentajeAhorro}% más barato)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">
                                {item.proveedores.length === 1 ? "1 proveedor registrado" : "Precios iguales"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {comparativaFiltrada.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-5">
                            <i className="bi bi-info-circle fs-3 d-block mb-2 text-muted"></i>
                            No hay datos de compras para comparar. Ingresa compras con diferentes proveedores para ver la comparativa de precios.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reportes;