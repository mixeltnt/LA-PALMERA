import { useCallback, useEffect, useState } from "react";
import ventaService from "../../services/ventaService";
import { useAuth } from "../../contexts/AuthContext";
import TicketVenta from "../../components/Ventas/TicketVenta";

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

function HistorialVentas() {
  const { user } = useAuth();
  const esAdmin = user?.rol === "admin";
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [anularVenta, setAnularVenta] = useState(null);
  const [anulando, setAnulando] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const buildParams = useCallback(() => {
    const params = { page, limit: 10 };
    if (search.trim()) params.search = search.trim();
    if (filtroEstado) params.estado = filtroEstado;
    if (filtroMetodo) params.metodoPago = filtroMetodo;
    return params;
  }, [search, filtroEstado, filtroMetodo, page]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ventaService.listar(buildParams());
      setVentas(data.ventas || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setError("");
    } catch (err) {
      setVentas([]);
      setError(err.message || "Error al cargar las ventas.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargar();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [search, filtroEstado, filtroMetodo]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const abrirDetalle = async (id) => {
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const data = await ventaService.obtenerPorId(id);
      setDetalle(data);
    } catch (err) {
      setError(err.message || "Error al cargar el detalle de la venta.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const confirmarAnulacion = async () => {
    if (!anularVenta) return;
    setAnulando(true);
    try {
      await ventaService.anular(anularVenta._id);
      setAnularVenta(null);
      setToast({
        type: "success",
        text: `Venta #${anularVenta.numeroVenta} anulada correctamente.`,
      });
      void cargar();
    } catch (err) {
      setAnularVenta(null);
      setError(err.message || "Error al anular la venta.");
    } finally {
      setAnulando(false);
    }
  };

  const formatMoney = (value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  };

  const formatFecha = (value) => {
    try {
      return new Date(value).toLocaleString("es-CL");
    } catch {
      return "—";
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Historial de Ventas</h3>
          <p className="text-muted small mb-0">
            Registro de todas las ventas, detalle y anulación. Total: {total}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

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
                  placeholder="Buscar por número, cliente o método..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="BORRADOR">Borrador</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="ANULADA">Anulada</option>
              </select>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filtroMetodo}
                onChange={(e) => setFiltroMetodo(e.target.value)}
              >
                <option value="">Todos los métodos de pago</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="DEBITO">Débito</option>
                <option value="CREDITO">Crédito</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="CAJA_VECINA">Caja Vecina</option>
                <option value="FIADO">Fiado</option>
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
                      <th>#</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th className="text-end">Total</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th>Usuario</th>
                      <th className="text-center" style={{ width: 130 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.length > 0 ? (
                      ventas.map((venta) => {
                        const estado = ESTADO_BADGE[venta.estado] || {
                          label: venta.estado,
                          className: "bg-secondary",
                        };
                        return (
                          <tr key={venta._id}>
                            <td className="fw-semibold">{venta.numeroVenta}</td>
                            <td className="text-nowrap">
                              {formatFecha(venta.fecha)}
                            </td>
                            <td>
                              {venta.cliente?.nombre || "Consumidor Final"}
                            </td>
                            <td className="text-end text-nowrap">
                              {formatMoney(venta.total)}
                            </td>
                            <td>
                              {METODO_PAGO_LABELS[venta.metodoPago] ||
                                venta.metodoPago}
                            </td>
                            <td>
                              <span className={`badge ${estado.className}`}>
                                {estado.label}
                              </span>
                            </td>
                            <td>
                              {venta.usuario?.nombre || venta.usuario?.usuario}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-primary btn-icon me-1"
                                onClick={() => abrirDetalle(venta._id)}
                                title="Ver detalle"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger btn-icon"
                                onClick={() => setAnularVenta(venta)}
                                disabled={
                                  venta.estado === "ANULADA" || !esAdmin
                                }
                                title={
                                  !esAdmin
                                    ? "Solo administradores"
                                    : venta.estado === "ANULADA"
                                      ? "Venta ya anulada"
                                      : "Anular venta"
                                }
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No se encontraron ventas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} ventas)
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

      {detalle && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-receipt me-2"></i>Venta #
                  {detalle.venta.numeroVenta}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDetalle(null)}
                ></button>
              </div>
              <div className="modal-body">
                {loadingDetalle ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="row g-3 mb-3 small">
                      <div className="col-md-4">
                        <div className="text-muted">Fecha</div>
                        <div className="fw-semibold">
                          {formatFecha(detalle.venta.fecha)}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-muted">Cliente</div>
                        <div className="fw-semibold">
                          {detalle.venta.cliente?.nombre || "Consumidor Final"}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-muted">Estado</div>
                        <div>
                          <span
                            className={`badge ${(ESTADO_BADGE[detalle.venta.estado] || {}).className || "bg-secondary"}`}
                          >
                            {(ESTADO_BADGE[detalle.venta.estado] || {})
                              .label || detalle.venta.estado}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-muted">Método de pago</div>
                        <div className="fw-semibold">
                          {METODO_PAGO_LABELS[detalle.venta.metodoPago] ||
                            detalle.venta.metodoPago}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-muted">Usuario</div>
                        <div className="fw-semibold">
                          {detalle.venta.usuario?.nombre ||
                            detalle.venta.usuario?.usuario}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="text-muted">Observaciones</div>
                        <div>{detalle.venta.observaciones || "—"}</div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Producto</th>
                            <th className="text-center">Cant.</th>
                            <th className="text-end">P. Unit.</th>
                            <th className="text-end">Descuento</th>
                            <th className="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detalle.detalles || []).map((item) => (
                            <tr key={item._id}>
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
                              <td className="text-center">{item.cantidad}</td>
                              <td className="text-end">
                                {formatMoney(item.precioUnitario)}
                              </td>
                              <td className="text-end">
                                {item.descuento
                                  ? formatMoney(item.descuento)
                                  : "—"}
                              </td>
                              <td className="text-end fw-semibold">
                                {formatMoney(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-top pt-3 mt-3">
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-muted">Subtotal</span>
                        <strong>{formatMoney(detalle.venta.subtotal)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1 small">
                        <span className="text-muted">Descuento</span>
                        <strong>
                          - {formatMoney(detalle.venta.descuento)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between fs-5">
                        <span className="fw-bold">Total</span>
                        <span className="fw-bold text-success">
                          {formatMoney(detalle.venta.total)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {detalle.venta.estado === "CONFIRMADA" && (
                  <button
                    type="button"
                    className="btn btn-success me-auto"
                    onClick={() => setTicketToPrint(detalle)}
                    title="Imprimir ticket de esta venta"
                  >
                    <i className="bi bi-printer me-1"></i>Imprimir ticket
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => setDetalle(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {anularVenta && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">Confirmar Anulación</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAnularVenta(null)}
                ></button>
              </div>
              <div className="modal-body text-center py-3">
                <i className="bi bi-exclamation-triangle text-danger fs-1 d-block mb-2"></i>
                <p className="mb-2 small">
                  ¿Estás seguro de anular la venta #{" "}
                  <strong>{anularVenta.numeroVenta}</strong> por{" "}
                  <strong>{formatMoney(anularVenta.total)}</strong>?
                  <br />
                  Esta acción no se puede deshacer.
                </p>
                {anularVenta.metodoPago === "FIADO" &&
                  anularVenta.estado === "CONFIRMADA" && (
                    <div className="alert alert-warning py-2 mb-0 small text-start">
                      <strong>Consecuencias:</strong>
                      <ul className="mb-0 ps-3 mt-1">
                        <li>Se repondrá el stock de los productos.</li>
                        <li>
                          El cargo FIADO se anulará en la cuenta del cliente.
                        </li>
                        <li>
                          Si el cliente había abonado, se generará un
                          REVERSO_ABONO para mantener el saldo correcto.
                        </li>
                      </ul>
                    </div>
                  )}
                {anularVenta.metodoPago === "FIADO" &&
                  anularVenta.estado === "BORRADOR" && (
                    <div className="alert alert-warning py-2 mb-0 small text-start">
                      Este borrador fiado no afectó stock ni la cuenta del
                      cliente.
                    </div>
                  )}
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAnularVenta(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={confirmarAnulacion}
                  disabled={anulando}
                >
                  {anulando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Anulando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle me-1"></i>Anular venta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="app-toast position-fixed bottom-0 end-0 p-3"
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

      {ticketToPrint && (
        <TicketVenta
          venta={ticketToPrint.venta}
          detalles={ticketToPrint.detalles}
          onAfterPrint={() => setTicketToPrint(null)}
        />
      )}
    </div>
  );
}

export default HistorialVentas;
