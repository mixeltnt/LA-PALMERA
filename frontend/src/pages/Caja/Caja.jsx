import { useCallback, useEffect, useState } from "react";
import cajaService from "../../services/cajaService";
import { useAuth } from "../../contexts/AuthContext";

const formatMoney = (value) => {
  const numeric = Number(value) || 0;
  return `$${numeric.toLocaleString("es-CL")}`;
};

const formatFecha = (value) => {
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

function Caja() {
  const { user } = useAuth();
  const [sesion, setSesion] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [historialSesiones, setHistorialSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modales
  const [showApertura, setShowApertura] = useState(false);
  const [montoInicial, setMontoInicial] = useState("");

  const [showMovimiento, setShowMovimiento] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState("ingreso");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [conceptoMovimiento, setConceptoMovimiento] = useState("");

  const [showCierre, setShowCierre] = useState(false);
  const [montoRealEfectivo, setMontoRealEfectivo] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");

  const [procesando, setProcesando] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const { sesion: activa } = await cajaService.obtenerSesionActiva();
      setSesion(activa);

      if (activa && activa.id) {
        const { movimientos: movs } = await cajaService.obtenerMovimientos(activa.id);
        setMovimientos(movs || []);
      } else {
        setMovimientos([]);
      }

      const { sesiones } = await cajaService.historialSesiones(15);
      setHistorialSesiones(sesiones || []);
    } catch (err) {
      console.error("Error cargando datos de caja:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    const monto = Number(montoInicial);
    if (isNaN(monto) || monto < 0) {
      setToast({ type: "danger", text: "Ingresa un monto inicial válido (mayor o igual a 0)." });
      return;
    }

    setProcesando(true);
    try {
      await cajaService.abrirCaja({
        usuarioId: user?.id || 1,
        usuarioNombre: user?.nombre || "Administrador",
        montoInicial: monto,
      });
      setShowApertura(false);
      setMontoInicial("");
      setToast({ type: "success", text: "Turno de caja abierto correctamente." });
      await cargarDatos();
    } catch (err) {
      setToast({ type: "danger", text: err.message || "Error al abrir la caja." });
    } finally {
      setProcesando(false);
    }
  };

  const handleRegistrarMovimiento = async (e) => {
    e.preventDefault();
    const monto = Number(montoMovimiento);
    if (!monto || monto <= 0) {
      setToast({ type: "danger", text: "Ingresa un monto válido mayor a 0." });
      return;
    }
    if (!conceptoMovimiento.trim()) {
      setToast({ type: "danger", text: "Ingresa el motivo o concepto del movimiento." });
      return;
    }

    setProcesando(true);
    try {
      await cajaService.registrarMovimiento({
        sessionId: sesion.id,
        tipo: tipoMovimiento,
        monto,
        concepto: conceptoMovimiento.trim(),
        usuarioId: user?.id || 1,
        usuarioNombre: user?.nombre || "Administrador",
      });
      setShowMovimiento(false);
      setMontoMovimiento("");
      setConceptoMovimiento("");
      setToast({
        type: "success",
        text: `${tipoMovimiento === "ingreso" ? "Ingreso" : "Egreso"} registrado con éxito.`,
      });
      await cargarDatos();
    } catch (err) {
      setToast({ type: "danger", text: err.message || "Error al registrar movimiento." });
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    const montoReal = Number(montoRealEfectivo);
    if (isNaN(montoReal) || montoReal < 0) {
      setToast({ type: "danger", text: "Ingresa el monto de efectivo contado en caja." });
      return;
    }

    setProcesando(true);
    try {
      await cajaService.cerrarCaja({
        sessionId: sesion.id,
        montoRealEfectivo: montoReal,
        observaciones: observacionesCierre.trim(),
      });
      setShowCierre(false);
      setMontoRealEfectivo("");
      setObservacionesCierre("");
      setToast({ type: "success", text: "Turno de caja cerrado y arqueado correctamente." });
      await cargarDatos();
    } catch (err) {
      setToast({ type: "danger", text: err.message || "Error al cerrar la caja." });
    } finally {
      setProcesando(false);
    }
  };

  // Cálculos de caja actual
  const montoInicialVal = Number(sesion?.montoInicial || 0);
  const ventasEfectivo = Number(sesion?.totalVentasEfectivo || 0);
  const ingresosExtra = Number(sesion?.totalIngresosExtra || 0);
  const egresosExtra = Number(sesion?.totalEgresosExtra || 0);
  const efectivoEsperado = montoInicialVal + ventasEfectivo + ingresosExtra - egresosExtra;

  const totalTarjetas =
    Number(sesion?.totalVentasDebito || 0) +
    Number(sesion?.totalVentasCredito || 0) +
    Number(sesion?.totalVentasTransferencia || 0);

  const diferenciaArqueo =
    montoRealEfectivo !== "" ? Number(montoRealEfectivo) - efectivoEsperado : null;

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`alert alert-${toast.type} alert-dismissible position-fixed top-0 end-0 m-4 shadow-lg`}
          style={{ zIndex: 9999, minWidth: "320px" }}
        >
          {toast.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setToast(null)}
          ></button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-success mb-1">
            <i className="bi bi-cash-register me-2"></i>Control de Caja y Turnos
          </h2>
          <p className="text-muted mb-0">
            Apertura de turno, arqueo de efectivo, retiros, ingresos y cuadre de caja.
          </p>
        </div>

        <div className="d-flex gap-2">
          {sesion ? (
            <>
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowMovimiento(true)}
              >
                <i className="bi bi-arrow-left-right me-1"></i> Movimiento Extra
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setMontoRealEfectivo("");
                  setObservacionesCierre("");
                  setShowCierre(true);
                }}
              >
                <i className="bi bi-lock-fill me-1"></i> Cerrar Turno
              </button>
            </>
          ) : (
            <button
              className="btn btn-success px-4"
              onClick={() => {
                setMontoInicial("");
                setShowApertura(true);
              }}
            >
              <i className="bi bi-unlock-fill me-1"></i> Abrir Turno de Caja
            </button>
          )}

          <button
            className="btn btn-outline-secondary"
            onClick={cargarDatos}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-success mb-2" role="status"></div>
          <div>Cargando información de caja...</div>
        </div>
      ) : sesion ? (
        <>
          {/* Tarjetas de Resumen de Sesión Activa */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <div className="card shadow-sm border-0 border-start border-success border-4 h-100">
                <div className="card-body">
                  <div className="text-muted small fw-semibold">ESTADO DEL TURNO</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="badge bg-success fs-6">Caja Abierta</span>
                  </div>
                  <div className="text-muted small mt-2">
                    <i className="bi bi-clock me-1"></i>
                    {formatFecha(sesion.fechaApertura)}
                  </div>
                  <div className="text-muted small">
                    <i className="bi bi-person me-1"></i>
                    {sesion.usuarioNombre || "Cajero"}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small fw-semibold">EFECTIVO ESPERADO EN CAJA</div>
                  <div className="fs-3 fw-bold text-success mt-1">
                    {formatMoney(efectivoEsperado)}
                  </div>
                  <div className="text-muted small mt-1">
                    Inicial: {formatMoney(montoInicialVal)} + Ventas Efectivo: {formatMoney(ventasEfectivo)}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small fw-semibold">VENTAS ELECTRÓNICAS (DÉB/CRÉD)</div>
                  <div className="fs-3 fw-bold text-primary mt-1">
                    {formatMoney(totalTarjetas)}
                  </div>
                  <div className="text-muted small mt-1">
                    Débito: {formatMoney(sesion.totalVentasDebito)} | Crédito: {formatMoney(sesion.totalVentasCredito)}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-3">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="text-muted small fw-semibold">MOVIMIENTOS EXTRA</div>
                  <div className="d-flex justify-content-between mt-2">
                    <span className="text-success small fw-semibold">
                      <i className="bi bi-plus-circle me-1"></i>Ingresos:
                    </span>
                    <span className="fw-bold">{formatMoney(ingresosExtra)}</span>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-danger small fw-semibold">
                      <i className="bi bi-dash-circle me-1"></i>Egresos:
                    </span>
                    <span className="fw-bold">{formatMoney(egresosExtra)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Movimientos del Turno */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-receipt me-2"></i>Movimientos del Turno Actual
              </h5>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowMovimiento(true)}
              >
                <i className="bi bi-plus-lg me-1"></i> Registrar Ingreso / Egreso
              </button>
            </div>
            <div className="card-body p-0">
              {movimientos.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No hay movimientos manuales registrados en este turno.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Hora</th>
                        <th>Tipo</th>
                        <th>Concepto / Motivo</th>
                        <th>Usuario</th>
                        <th className="text-end">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m) => (
                        <tr key={m.id}>
                          <td>{formatFecha(m.fecha)}</td>
                          <td>
                            <span
                              className={`badge ${
                                m.tipo === "ingreso" || m.tipo === "apertura"
                                  ? "bg-success"
                                  : "bg-danger"
                              }`}
                            >
                              {m.tipo.toUpperCase()}
                            </span>
                          </td>
                          <td className="fw-semibold">{m.concepto}</td>
                          <td>{m.usuarioNombre || "Usuario"}</td>
                          <td
                            className={`text-end fw-bold ${
                              m.tipo === "egreso" ? "text-danger" : "text-success"
                            }`}
                          >
                            {m.tipo === "egreso" ? "-" : "+"}
                            {formatMoney(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card shadow-sm border-0 mb-4 p-5 text-center">
          <div className="py-4">
            <i className="bi bi-lock fs-1 text-muted d-block mb-3"></i>
            <h4 className="fw-bold text-dark">La caja se encuentra cerrada</h4>
            <p className="text-muted mx-auto" style={{ maxWidth: "480px" }}>
              Para iniciar las operaciones del día y registrar ventas, por favor abre un nuevo turno ingresando el monto inicial en efectivo.
            </p>
            <button
              className="btn btn-success btn-lg px-4 mt-2"
              onClick={() => {
                setMontoInicial("");
                setShowApertura(true);
              }}
            >
              <i className="bi bi-unlock-fill me-2"></i> Abrir Turno de Caja
            </button>
          </div>
        </div>
      )}

      {/* Historial de Turnos Anteriores */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-clock-history me-2"></i>Historial de Turnos de Caja
          </h5>
        </div>
        <div className="card-body p-0">
          {historialSesiones.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No hay turnos registrados en el historial.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Cajero</th>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th className="text-end">Monto Inicial</th>
                    <th className="text-end">Ventas Efectivo</th>
                    <th className="text-end">Esperado</th>
                    <th className="text-end">Real Contado</th>
                    <th className="text-end">Diferencia</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialSesiones.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-bold">#{s.id}</td>
                      <td>{s.usuarioNombre || "Cajero"}</td>
                      <td className="small">{formatFecha(s.fechaApertura)}</td>
                      <td className="small">{s.fechaCierre ? formatFecha(s.fechaCierre) : "—"}</td>
                      <td className="text-end">{formatMoney(s.montoInicial)}</td>
                      <td className="text-end">{formatMoney(s.totalVentasEfectivo)}</td>
                      <td className="text-end fw-semibold">{formatMoney(s.montoEsperadoEfectivo)}</td>
                      <td className="text-end fw-semibold">{formatMoney(s.montoRealEfectivo)}</td>
                      <td
                        className={`text-end fw-bold ${
                          s.diferencia < 0
                            ? "text-danger"
                            : s.diferencia > 0
                            ? "text-primary"
                            : "text-success"
                        }`}
                      >
                        {formatMoney(s.diferencia)}
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge ${
                            s.estado === "abierta" ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {s.estado.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL APERTURA DE CAJA */}
      {showApertura && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-unlock-fill me-2"></i>Apertura de Turno de Caja
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowApertura(false)}
                ></button>
              </div>
              <form onSubmit={handleAbrirCaja}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Cajero Responsable</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={user?.nombre || "Administrador"}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Monto Inicial en Efectivo ($ CLP)</label>
                    <input
                      type="number"
                      className="form-control form-control-lg text-end fw-bold"
                      placeholder="Ej: 50000"
                      min="0"
                      step="1"
                      autoFocus
                      required
                      value={montoInicial}
                      onChange={(e) => setMontoInicial(e.target.value)}
                    />
                    <div className="form-text">
                      Dinero base con el que comienza el cajero para dar vuelto.
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowApertura(false)}
                    disabled={procesando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success px-4 fw-semibold"
                    disabled={procesando}
                  >
                    {procesando ? "Abriendo..." : "Confirmar Apertura"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO EXTRA (INGRESO / EGRESO) */}
      {showMovimiento && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-arrow-left-right me-2"></i>Registrar Movimiento Extra
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMovimiento(false)}
                ></button>
              </div>
              <form onSubmit={handleRegistrarMovimiento}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tipo de Movimiento</label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn flex-fill ${
                          tipoMovimiento === "ingreso" ? "btn-success" : "btn-outline-success"
                        }`}
                        onClick={() => setTipoMovimiento("ingreso")}
                      >
                        <i className="bi bi-plus-circle me-1"></i> Ingreso Extra
                      </button>
                      <button
                        type="button"
                        className={`btn flex-fill ${
                          tipoMovimiento === "egreso" ? "btn-danger" : "btn-outline-danger"
                        }`}
                        onClick={() => setTipoMovimiento("egreso")}
                      >
                        <i className="bi bi-dash-circle me-1"></i> Retiro / Egreso
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Monto ($ CLP)</label>
                    <input
                      type="number"
                      className="form-control form-control-lg text-end fw-bold"
                      placeholder="Ej: 10000"
                      min="1"
                      step="1"
                      autoFocus
                      required
                      value={montoMovimiento}
                      onChange={(e) => setMontoMovimiento(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Concepto / Motivo</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Pago a proveedor de pan, compra de bolsas..."
                      required
                      value={conceptoMovimiento}
                      onChange={(e) => setConceptoMovimiento(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowMovimiento(false)}
                    disabled={procesando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-semibold"
                    disabled={procesando}
                  >
                    {procesando ? "Guardando..." : "Registrar Movimiento"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CIERRE Y ARQUEO DE CAJA */}
      {showCierre && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-lock-fill me-2"></i>Cierre y Arqueo de Caja
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowCierre(false)}
                ></button>
              </div>
              <form onSubmit={handleCerrarCaja}>
                <div className="modal-body p-4">
                  <div className="bg-light p-3 rounded mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span>Monto Inicial:</span>
                      <span className="fw-semibold">{formatMoney(montoInicialVal)}</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span>+ Ventas Efectivo:</span>
                      <span className="fw-semibold text-success">{formatMoney(ventasEfectivo)}</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span>+ Ingresos Extra:</span>
                      <span className="fw-semibold">{formatMoney(ingresosExtra)}</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span>- Egresos / Retiros:</span>
                      <span className="fw-semibold text-danger">{formatMoney(egresosExtra)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between fw-bold fs-6">
                      <span>Efectivo Esperado:</span>
                      <span className="text-success">{formatMoney(efectivoEsperado)}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">
                      Efectivo Real Contado en Gaveta ($ CLP)
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-lg text-end fw-bold"
                      placeholder="Ingrese el monto físico contado"
                      min="0"
                      step="1"
                      autoFocus
                      required
                      value={montoRealEfectivo}
                      onChange={(e) => setMontoRealEfectivo(e.target.value)}
                    />
                  </div>

                  {diferenciaArqueo !== null && (
                    <div
                      className={`alert ${
                        diferenciaArqueo === 0
                          ? "alert-success"
                          : diferenciaArqueo > 0
                          ? "alert-info"
                          : "alert-danger"
                      } py-2 mb-3`}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-semibold">
                          {diferenciaArqueo === 0
                            ? "Cuadre Exacto"
                            : diferenciaArqueo > 0
                            ? "Sobrante en caja:"
                            : "Faltante en caja:"}
                        </span>
                        <span className="fw-bold fs-6">
                          {diferenciaArqueo > 0 ? "+" : ""}
                          {formatMoney(diferenciaArqueo)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-2">
                    <label className="form-label small text-muted">Observaciones de Cierre (Opcional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Notas del arqueo o justificación de diferencias..."
                      value={observacionesCierre}
                      onChange={(e) => setObservacionesCierre(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCierre(false)}
                    disabled={procesando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger px-4 fw-semibold"
                    disabled={procesando}
                  >
                    {procesando ? "Cerrando..." : "Confirmar Cierre de Caja"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Caja;
