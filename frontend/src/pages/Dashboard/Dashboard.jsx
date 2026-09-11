import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import productService from "../../services/productService";
import clientService from "../../services/clientService";
import categoryService from "../../services/categoryService";
import ventaService from "../../services/ventaService";
import compraService from "../../services/compraService";

const METODO_PAGO_LABELS = {
  EFECTIVO: "Efectivo",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferencia",
  CAJA_VECINA: "Caja Vecina",
  FIADO: "Fiado",
};

const ESTADO_BADGE = {
  BORRADOR: { label: "Borrador", className: "bg-secondary" },
  CONFIRMADA: { label: "Confirmada", className: "bg-success" },
  ANULADA: { label: "Anulada", className: "bg-danger" },
  COMPLETADA: { label: "Completada", className: "bg-success" },
};

const formatMoney = (value) => {
  const numeric = Number(value) || 0;
  return `$${numeric.toLocaleString("es-CL")}`;
};

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
    return "—";
  }
};

const toISODate = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [ultimasVentas, setUltimasVentas] = useState([]);
  const [deudoresList, setDeudoresList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeudoresModal, setShowDeudoresModal] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const hoy = new Date();
      const mes = toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      const hoyIso = toISODate(hoy);

      const results = await Promise.allSettled([
        productService.stats(),
        clientService.stats(),
        categoryService.stats(),
        ventaService.estadisticas({ desde: hoyIso, hasta: hoyIso }),
        ventaService.estadisticas({ desde: mes, hasta: hoyIso }),
        ventaService.estadisticas(),
        compraService.resumen(),
        ventaService.listar({ limit: 5, page: 1 }),
        clientService.cuentasPorCobrar(),
      ]);

      const [
        pStatsRes,
        cStatsRes,
        catStatsRes,
        ventasHoyRes,
        ventasMesRes,
        ingresosRes,
        comprasRes,
        ultimasRes,
        cuentasPorCobrarRes,
      ] = results;

      const pStats = pStatsRes.status === "fulfilled" ? pStatsRes.value : { total: 0, stockBajo: 0 };
      const cStats = cStatsRes.status === "fulfilled" ? cStatsRes.value : { total: 0 };
      const catStats = catStatsRes.status === "fulfilled" ? catStatsRes.value : { total: 0 };
      const ventasHoy = ventasHoyRes.status === "fulfilled" ? ventasHoyRes.value : {};
      const ventasMes = ventasMesRes.status === "fulfilled" ? ventasMesRes.value : {};
      const ingresos = ingresosRes.status === "fulfilled" ? ingresosRes.value : {};
      const compras = comprasRes.status === "fulfilled" ? comprasRes.value : { cantidad: 0 };
      const ultimas = ultimasRes.status === "fulfilled" ? ultimasRes.value : { ventas: [] };
      const cuentasPorCobrar = cuentasPorCobrarRes.status === "fulfilled" ? cuentasPorCobrarRes.value : {};

      const defaultResumen = {
        totalVendido: 0,
        totalVentas: 0,
        ventasAnuladas: 0,
        ticketPromedio: 0,
        costoTotal: 0,
        utilidadTotal: 0,
        margenPorcentaje: 0,
      };

      const deudores = cuentasPorCobrar?.cuentas || cuentasPorCobrar?.clientes || [];
      setDeudoresList(deudores);

      setStats({
        productos: pStats?.total ?? 0,
        stockBajo: pStats?.stockBajo ?? 0,
        clientes: cStats?.total ?? 0,
        categorias: catStats?.total ?? 0,
        ventasHoy: ventasHoy?.resumen || defaultResumen,
        ventasMes: ventasMes?.resumen || defaultResumen,
        ingresos: ingresos?.resumen || defaultResumen,
        compras: compras?.cantidad || 0,
        cuentasPorCobrar:
          cuentasPorCobrar?.resumen?.totalPorCobrar ?? cuentasPorCobrar?.totalDeuda ?? 0,
        deudores: deudores.length,
      });

      setUltimasVentas(ultimas?.ventas || []);
      setError("");
    } catch (err) {
      console.warn("Error cargando métricas de dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [cargar]);

  const cards = [
    { icon: "bi-cash-stack", label: "Ventas de Hoy", value: stats ? formatMoney(stats.ventasHoy?.totalVendido) : "...", color: "success", link: "/ventas/historial" },
    { 
      icon: "bi-graph-up-arrow", 
      label: "Ganancia Real Hoy", 
      value: stats ? formatMoney(stats.ventasHoy?.utilidadTotal || 0) : "...", 
      subValue: stats && stats.ventasHoy?.margenPorcentaje > 0 ? `${stats.ventasHoy.margenPorcentaje}% margen` : null,
      color: "info", 
      link: "/reportes" 
    },
    { icon: "bi-calendar-month", label: "Ventas del Mes", value: stats ? formatMoney(stats.ventasMes?.totalVendido) : "...", color: "primary", link: "/reportes" },
    { icon: "bi-cash-coin", label: `Por Cobrar Fiados (${stats ? String(stats.deudores ?? 0) : "0"})`, value: stats ? formatMoney(stats.cuentasPorCobrar) : "...", color: "danger", link: "/clientes", isFiadoCard: true },
    { icon: "bi-truck", label: "Compras Realizadas", value: stats ? String(stats.compras ?? 0) : "...", color: "warning", link: "/compras" },
    { icon: "bi-box-seam-fill", label: "Productos en Catálogo", value: stats ? String(stats.productos ?? 0) : "...", color: "primary", link: "/productos" },
    { icon: "bi-exclamation-triangle-fill", label: "Stock Bajo", value: stats ? String(stats.stockBajo ?? 0) : "...", color: "danger", link: "/inventario" },
    { icon: "bi-people-fill", label: "Clientes Registrados", value: stats ? String(stats.clientes ?? 0) : "...", color: "secondary", link: "/clientes" },
  ];

  const alertas = [
    {
      icon: "bi-cash-coin",
      iconClass: "text-danger",
      texto: stats && stats.cuentasPorCobrar > 0
        ? `Tienes ${formatMoney(stats.cuentasPorCobrar)} pendientes en ${stats.deudores} cliente(s) fiado(s).`
        : "No hay deudas de fiados pendientes.",
      actionText: stats && stats.cuentasPorCobrar > 0 ? "Ver deudores" : null,
      onAction: () => navigate("/clientes"),
    },
    {
      icon: "bi-exclamation-triangle-fill",
      iconClass: "text-warning",
      texto: stats ? `${stats.stockBajo ?? 0} producto(s) con stock bajo` : "Cargando...",
      actionText: "Ver inventario",
      onAction: () => navigate("/inventario"),
    },
    {
      icon: "bi-x-circle",
      iconClass: "text-danger",
      texto: stats ? `${stats.ventasHoy?.ventasAnuladas ?? 0} venta(s) anulada(s) hoy` : "Cargando...",
      actionText: "Ver historial",
      onAction: () => navigate("/ventas/historial"),
    },
  ];

  return (
    <div className="pb-4">
      {/* Cabecera del Dashboard */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
        <div>
          <h3 className="fw-bold mb-0 fs-5 fs-md-4">
            <i className="bi bi-speedometer2 text-success me-2"></i>Dashboard
          </h3>
          <p className="text-muted small mb-0 d-none d-sm-block">Resumen y métricas en tiempo real de tu negocio</p>
        </div>
        <div className="d-flex align-items-center gap-1 gap-sm-2 w-100 w-sm-auto justify-content-between justify-content-sm-end">
          <button 
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-sm px-2 py-1"
            onClick={() => setShowDeudoresModal(true)}
            title="Ver desglose de fiados por cobrar"
            style={{ fontSize: "0.78rem" }}
          >
            <i className="bi bi-cash-coin"></i>
            <span>Fiados ({formatMoney(stats?.cuentasPorCobrar || 0)})</span>
          </button>
          <span className="badge bg-success bg-opacity-10 text-success px-2 py-1 text-truncate" style={{ fontSize: "0.72rem" }}>
            <i className="bi bi-calendar-check me-1"></i>
            {new Date().toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Tarjetas Principales en 2 Columnas Móviles / 4 en Escritorio */}
      <div className="row g-2 g-md-3 mb-3">
        {cards.map((card) => (
          <div key={card.label} className="col-6 col-md-4 col-xl-3">
            <div 
              className={`card border-0 shadow-sm h-100 ${card.link ? "cursor-pointer" : ""}`}
              onClick={() => {
                if (card.isFiadoCard) {
                  setShowDeudoresModal(true);
                } else if (card.link) {
                  navigate(card.link);
                }
              }}
              style={{
                cursor: card.link ? "pointer" : "default",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (card.link) {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                }
              }}
              onMouseLeave={(e) => {
                if (card.link) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "";
                }
              }}
            >
              <div className="card-body p-2 p-md-3 d-flex align-items-center gap-2 gap-md-3">
                <div className={`p-2 p-md-3 rounded-circle bg-${card.color} bg-opacity-10 text-${card.color} fs-5 fs-md-4 d-flex align-items-center justify-content-center`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <span className="text-muted d-block text-truncate" style={{ fontSize: "0.72rem" }}>{card.label}</span>
                  <div className="d-flex flex-wrap align-items-baseline gap-1">
                    <span className="fw-bold text-dark text-truncate" style={{ fontSize: "0.95rem" }}>{card.value}</span>
                    {card.subValue && (
                      <span className="badge bg-success-subtle text-success fw-normal px-1 py-0" style={{ fontSize: "0.62rem" }}>
                        {card.subValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desglose de Deudores Fiados Directo en Dashboard */}
      {deudoresList.length > 0 && (
        <div className="card border-0 shadow-sm mt-4 border-start border-danger border-4">
          <div className="card-header bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-octagon-fill"></i>
                Cuentas por Cobrar (Fiados Activos)
              </h5>
              <small className="text-muted">Total pendiente: {formatMoney(stats?.cuentasPorCobrar || 0)} distribuidos en {deudoresList.length} cliente(s)</small>
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => navigate("/clientes")}
            >
              Ir a Clientes (Fiados) <i className="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
          <div className="card-body pt-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Cliente</th>
                    <th>RUT</th>
                    <th>Teléfono</th>
                    <th className="text-end">Límite Fiado</th>
                    <th className="text-end">Deuda Pendiente</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {deudoresList.map((d) => (
                    <tr key={d.id || d._id}>
                      <td className="fw-bold">{d.nombre}</td>
                      <td className="text-muted">{d.rut || "—"}</td>
                      <td>{d.telefono || "—"}</td>
                      <td className="text-end text-muted">{formatMoney(d.limiteFiado || d.limiteCredito || 0)}</td>
                      <td className="text-end fw-bold text-danger fs-6">{formatMoney(d.saldoDeudor || d.saldoPendiente || 0)}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => navigate("/clientes")}
                          title="Ver cuenta y registrar abonos"
                        >
                          <i className="bi bi-cash-coin me-1"></i>Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tablas de Últimas Ventas y Alertas */}
      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-semibold mb-0">Últimas Ventas Realizadas</h5>
              <button 
                className="btn btn-link btn-sm text-decoration-none text-success"
                onClick={() => navigate("/ventas/historial")}
              >
                Ver todo el historial <i className="bi bi-arrow-right"></i>
              </button>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  Cargando ventas...
                </div>
              ) : ultimasVentas.length === 0 ? (
                <div className="text-center py-4 text-muted">Sin ventas registradas.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Método</th>
                        <th className="text-end">Total</th>
                        <th className="text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimasVentas.map((venta) => {
                        const badge = ESTADO_BADGE[venta.estado?.toUpperCase()] || {
                          label: venta.estado || "Completada",
                          className: "bg-secondary",
                        };
                        return (
                          <tr key={venta._id || venta.id}>
                            <td className="fw-bold">#{venta.numeroVenta || venta.folio || venta.id}</td>
                            <td className="text-muted small">{formatFechaHora(venta.fecha || venta.creadoEn)}</td>
                            <td className="fw-semibold">{venta.cliente?.nombre || venta.clienteNombre || "Consumidor Final"}</td>
                            <td>
                              <span className={`badge ${venta.metodoPagoPrincipal === 'fiado' || venta.metodoPago === 'FIADO' ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                                {METODO_PAGO_LABELS[String(venta.metodoPago || venta.metodoPagoPrincipal || '').toUpperCase()] || venta.metodoPago || "Efectivo"}
                              </span>
                            </td>
                            <td className="text-end fw-bold">{formatMoney(venta.total)}</td>
                            <td className="text-center">
                              <span className={`badge ${badge.className}`}>{badge.label}</span>
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
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pt-3 pb-0">
              <h5 className="fw-semibold mb-0">Alertas y Notificaciones</h5>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column gap-3">
                {alertas.map((alerta, index) => (
                  <div key={index} className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className={`bi ${alerta.icon} fs-5 ${alerta.iconClass}`}></i>
                      <span className="small text-dark">{alerta.texto}</span>
                    </div>
                    {alerta.actionText && (
                      <button
                        className="btn btn-outline-secondary btn-sm py-0 px-2 ms-2 text-nowrap"
                        style={{ fontSize: "0.75rem" }}
                        onClick={alerta.onAction}
                      >
                        {alerta.actionText}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Desglose Deudores */}
      {showDeudoresModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-cash-coin me-2"></i>Reporte Detallado de Fiados por Cobrar
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeudoresModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger py-2 d-flex justify-content-between align-items-center mb-3">
                  <span>Total pendiente en deudores:</span>
                  <span className="fs-5 fw-bold">{formatMoney(stats?.cuentasPorCobrar || 0)}</span>
                </div>
                {deudoresList.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-check-circle-fill text-success fs-2 d-block mb-2"></i>
                    ¡Excelente! No hay clientes con saldos pendientes por cobrar.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Cliente</th>
                          <th>RUT</th>
                          <th>Teléfono</th>
                          <th className="text-end">Límite</th>
                          <th className="text-end">Deuda Actual</th>
                          <th className="text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deudoresList.map((d) => (
                          <tr key={d.id || d._id}>
                            <td className="fw-bold">{d.nombre}</td>
                            <td>{d.rut || "—"}</td>
                            <td>{d.telefono || "—"}</td>
                            <td className="text-end text-muted">{formatMoney(d.limiteFiado || d.limiteCredito || 0)}</td>
                            <td className="text-end fw-bold text-danger">{formatMoney(d.saldoDeudor || d.saldoPendiente || 0)}</td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => {
                                  setShowDeudoresModal(false);
                                  navigate("/clientes");
                                }}
                              >
                                Cobrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeudoresModal(false)}
                >
                  Cerrar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setShowDeudoresModal(false);
                    navigate("/clientes");
                  }}
                >
                  Ir a Módulo Clientes (Fiados)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;