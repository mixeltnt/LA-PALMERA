import { useCallback, useEffect, useState } from "react";
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
  const [stats, setStats] = useState(null);
  const [ultimasVentas, setUltimasVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const hoy = new Date();
      const mes = toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      const hoyIso = toISODate(hoy);

      const [pStats, cStats, catStats, ventasHoy, ventasMes, ingresos, compras, ultimas] =
        await Promise.all([
          productService.stats(),
          clientService.stats(),
          categoryService.stats(),
          ventaService.estadisticas({ desde: hoyIso, hasta: hoyIso }),
          ventaService.estadisticas({ desde: mes, hasta: hoyIso }),
          ventaService.estadisticas(),
          compraService.resumen(),
          ventaService.listar({ limit: 5, page: 1 }),
        ]);

      setStats({
        productos: pStats.total,
        stockBajo: pStats.stockBajo,
        clientes: cStats.total,
        categorias: catStats.total,
        ventasHoy: ventasHoy.resumen,
        ventasMes: ventasMes.resumen,
        ingresos: ingresos.resumen,
        compras: compras.cantidad || 0,
      });
      setUltimasVentas(ultimas.ventas || []);
      setError("");
    } catch (err) {
      setError(err.message || "Error al cargar el dashboard.");
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
    { icon: "bi-cash-stack", label: "Ventas de Hoy", value: stats ? formatMoney(stats.ventasHoy.totalVendido) : "...", color: "success" },
    { icon: "bi-calendar-month", label: "Ventas del Mes", value: stats ? formatMoney(stats.ventasMes.totalVendido) : "...", color: "primary" },
    { icon: "bi-currency-dollar", label: "Ingresos", value: stats ? formatMoney(stats.ingresos.totalVendido) : "...", color: "success" },
    { icon: "bi-truck", label: "Compras", value: stats ? String(stats.compras) : "...", color: "warning" },
    { icon: "bi-box-seam-fill", label: "Productos", value: stats ? String(stats.productos) : "...", color: "primary" },
    { icon: "bi-exclamation-triangle-fill", label: "Stock Bajo", value: stats ? String(stats.stockBajo) : "...", color: "danger" },
    { icon: "bi-tags-fill", label: "Categorías", value: stats ? String(stats.categorias) : "...", color: "secondary" },
    { icon: "bi-people-fill", label: "Clientes", value: stats ? String(stats.clientes) : "...", color: "info" },
  ];

  const alertas = [
    {
      icon: "bi-exclamation-triangle-fill",
      iconClass: "text-danger",
      texto: stats ? `${stats.stockBajo} productos con stock bajo` : "Cargando...",
    },
    {
      icon: "bi-x-circle",
      iconClass: "text-danger",
      texto: stats ? `${stats.ventasHoy.ventasAnuladas} ventas anuladas hoy` : "Cargando...",
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Dashboard</h3>
          <p className="text-muted small mb-0">Resumen general del negocio</p>
        </div>
        <span className="badge bg-success bg-opacity-10 text-success px-3 py-2">
          <i className="bi bi-calendar-check me-1"></i>
          {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        {cards.map((card) => (
          <div key={card.label} className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <div className={`d-flex align-items-center justify-content-center rounded-circle bg-${card.color} bg-opacity-10 text-${card.color}`}
                    style={{ width: 52, height: 52 }}>
                    <i className={`bi ${card.icon} fs-4`}></i>
                  </div>
                  <div>
                    <p className="text-muted small mb-0">{card.label}</p>
                    <h4 className="fw-bold mb-0">{card.value}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Últimas Ventas</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Método</th>
                      <th className="text-end">Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <div className="spinner-border spinner-border-sm text-success"></div>
                        </td>
                      </tr>
                    ) : ultimasVentas.length > 0 ? (
                      ultimasVentas.map((venta) => {
                        const estado = ESTADO_BADGE[venta.estado] || {
                          label: venta.estado,
                          className: "bg-secondary",
                        };
                        return (
                          <tr key={venta._id}>
                            <td className="fw-semibold">{venta.numeroVenta}</td>
                            <td className="text-nowrap">{formatFechaHora(venta.fecha)}</td>
                            <td>{venta.cliente?.nombre || "Consumidor Final"}</td>
                            <td>
                              {METODO_PAGO_LABELS[venta.metodoPago] || venta.metodoPago}
                            </td>
                            <td className="text-end text-nowrap">
                              {formatMoney(venta.total)}
                            </td>
                            <td>
                              <span className={`badge ${estado.className}`}>
                                {estado.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4">
                          Sin ventas registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Alertas</h6>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush small">
                {alertas.map((alerta) => (
                  <li key={alerta.icon} className="list-group-item d-flex align-items-center gap-2 px-0">
                    <i className={`bi ${alerta.icon} ${alerta.iconClass}`}></i>
                    <span>{alerta.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;