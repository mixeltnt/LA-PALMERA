import { useCallback, useEffect, useMemo, useState } from "react";
import ventaService from "../../services/ventaService";

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CAJA_VECINA", label: "Caja Vecina" },
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
  const [periodo, setPeriodo] = useState("hoy");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

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

  const cargar = useCallback(async () => {
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
      setError(err.message || "Error al cargar los reportes.");
    } finally {
      setLoading(false);
    }
  }, [rango, rangoValido, metodoPago]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resumen = data?.estadisticas?.resumen;
  const porMetodoPago = data?.estadisticas?.porMetodoPago || [];
  const totalMetodo = porMetodoPago.reduce((suma, grupo) => suma + grupo.monto, 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Reportes</h3>
          <p className="text-muted small mb-0">
            Información real de ventas desde MongoDB.
          </p>
        </div>
      </div>

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
          {periodo === "rango" && !rangoValido && (
            <div className="alert alert-warning py-2 small mt-3">
              Selecciona un rango válido (desde menor o igual que hasta).
            </div>
          )}
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
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Total vendido</p>
                  <h4 className="fw-bold mb-0 text-success">
                    {formatMoney(resumen?.totalVendido)}
                  </h4>
                  <small className="text-muted">Solo ventas confirmadas</small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Ventas confirmadas</p>
                  <h4 className="fw-bold mb-0">
                    {resumen?.cantidadVentasConfirmadas ?? 0}
                  </h4>
                  <small className="text-muted">Cantidad de ventas</small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Ticket promedio</p>
                  <h4 className="fw-bold mb-0">
                    {formatMoney(resumen?.ticketPromedio)}
                  </h4>
                  <small className="text-muted">Total / cantidad confirmadas</small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Ventas anuladas</p>
                  <h4 className="fw-bold mb-0">
                    {resumen?.ventasAnuladas ?? 0}
                  </h4>
                  <small className="text-muted">No cuentan como ingreso</small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Monto anulado</p>
                  <h4 className="fw-bold mb-0 text-danger">
                    {formatMoney(resumen?.montoAnulado)}
                  </h4>
                  <small className="text-muted">Excluido de los ingresos</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 className="fw-bold mb-0">Métodos de Pago</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Método</th>
                          <th className="text-center">Cant.</th>
                          <th className="text-end">Monto</th>
                          <th className="text-end">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {METODOS_PAGO.map((metodo) => {
                          const grupo = porMetodoPago.find(
                            (item) => item.metodoPago === metodo.value,
                          );
                          const cantidad = grupo?.cantidad || 0;
                          const monto = grupo?.monto || 0;
                          const porcentaje =
                            totalMetodo > 0
                              ? ((monto / totalMetodo) * 100).toFixed(1)
                              : "0.0";
                          return (
                            <tr key={metodo.value}>
                              <td className="fw-semibold">{metodo.label}</td>
                              <td className="text-center">{cantidad}</td>
                              <td className="text-end text-nowrap">
                                {formatMoney(monto)}
                              </td>
                              <td className="text-end">{porcentaje}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 className="fw-bold mb-0">Productos más vendidos</h6>
                </div>
                <div className="card-body">
                  {data?.masVendidos.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Producto</th>
                            <th className="text-end">Cantidad vendida</th>
                            <th className="text-end">Monto vendido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.masVendidos.map((item, index) => (
                            <tr key={item.producto?._id || index}>
                              <td>{index + 1}</td>
                              <td>
                                <div className="fw-semibold">
                                  {item.producto?.nombre || "Producto eliminado"}
                                </div>
                                {item.producto?.codigo && (
                                  <div className="text-muted small">
                                    {item.producto.codigo}
                                  </div>
                                )}
                              </td>
                              <td className="text-end">{item.cantidad}</td>
                              <td className="text-end text-nowrap">
                                {formatMoney(item.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-4">
                      Sin ventas en el período seleccionado.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Serie de ventas — últimos 7 días</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th className="text-center">Cantidad de ventas</th>
                      <th className="text-end">Monto vendido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.serie.map((dia) => (
                      <tr key={dia.fecha}>
                        <td className="fw-semibold">{formatFecha(dia.fecha)}</td>
                        <td className="text-center">{dia.cantidad}</td>
                        <td className="text-end text-nowrap">
                          {formatMoney(dia.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reportes;