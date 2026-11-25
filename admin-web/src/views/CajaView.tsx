import React, { useEffect, useState } from "react";
import { Wallet, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "../services/api";

export const CajaView: React.FC = () => {
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [paginacion, setPaginacion] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [selectedSesion, setSelectedSesion] = useState<any | null>(null);

  const fetchSesiones = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getCajaSesiones({ page, limit: 12 });
      setSesiones(res.sesiones || []);
      setPaginacion(res.paginacion || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Error cargando sesiones de caja:", err);
    } finally {
      setLoading(false);
    }
  };

  const openSesionDetalle = async (id: string | number) => {
    try {
      const res = await adminApi.getCajaMovimientos(id);
      setSelectedSesion(res);
    } catch {
      alert("No se pudo cargar los movimientos de la sesión de caja.");
    }
  };

  useEffect(() => {
    fetchSesiones(1);
  }, []);

  const formatMoney = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("es-CL")}`;
  };
  const formatDateTimeSafe = (dateStr?: string | null) => {
    if (!dateStr) return "---";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "---"
      : d.toLocaleString("es-CL", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const formatTimeSafe = (dateStr?: string | null) => {
    if (!dateStr) return "---";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "---"
      : d.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  return (
    <div className="page-container">
      {/* Caja Table */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
              Historial de Turnos y Arqueos de Caja
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Sesiones de caja sincronizadas en PostgreSQL Neon
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID Turno</th>
                <th>Cajero / Usuario</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Monto Inicial</th>
                <th>Total Ventas</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando turnos de caja desde la réplica remota...
                  </td>
                </tr>
              ) : sesiones.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No hay turnos de caja registrados.
                  </td>
                </tr>
              ) : (
                sesiones.map((s) => {
                  const estaAbierta = s.estado === "abierta" || !s.fecha_cierre;
                  return (
                    <tr key={s.id || s.sqlite_id}>
                      <td>
                        <span style={{ fontWeight: "700", color: "#34d399" }}>#{s.id || s.sqlite_id}</span>
                      </td>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>{s.usuario_nombre || "Cajero"}</td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatDateTimeSafe(s.fecha_apertura)}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {s.fecha_cierre ? formatDateTimeSafe(s.fecha_cierre) : "En curso..."}
                      </td>
                      <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatMoney(s.monto_inicial)}
                      </td>
                      <td style={{ fontWeight: "700", color: "#f8fafc", whiteSpace: "nowrap" }}>
                        {formatMoney(s.total_ventas)}
                      </td>
                      <td>
                        <span className={`badge ${estaAbierta ? "badge-success" : "badge-info"}`}>
                          {estaAbierta ? "Abierta" : "Cerrada"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => openSesionDetalle(s.id || s.sqlite_id)}
                          className="btn btn-secondary btn-sm"
                          title="Ver Movimientos de Caja"
                          style={{ padding: "6px 10px" }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {paginacion.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Página {paginacion.page} de {paginacion.totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                disabled={paginacion.page <= 1}
                onClick={() => fetchSesiones(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchSesiones(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Movimientos de Caja (Responsive Bottom Sheet) */}
      {selectedSesion && (
        <div className="modal-overlay" onClick={() => setSelectedSesion(null)}>
          <div className="modal-content" style={{ padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Wallet size={22} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
                    Turno #{selectedSesion.sesion?.id || selectedSesion.sesion?.sqlite_id}
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Cajero: {selectedSesion.sesion?.usuario_nombre || "Cajero"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSesion(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sesion Resumen */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                padding: "12px",
                backgroundColor: "rgba(0,0,0,0.25)",
                borderRadius: "var(--radius-md)",
                marginBottom: "16px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Monto Inicial:</span>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc", marginTop: "2px" }}>
                  {formatMoney(selectedSesion.sesion?.monto_inicial)}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Total Ventas:</span>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#34d399", marginTop: "2px" }}>
                  {formatMoney(selectedSesion.sesion?.total_ventas)}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "8px" }}>
              Movimientos de Caja
            </h4>
            <div className="table-responsive" style={{ marginBottom: "16px" }}>
              <table className="table" style={{ fontSize: "12px", minWidth: "360px" }}>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSesion.movimientos && selectedSesion.movimientos.length > 0 ? (
                    selectedSesion.movimientos.map((m: any, idx: number) => {
                      const esIngreso = m.tipo === "ingreso" || m.tipo === "venta";
                      return (
                        <tr key={idx}>
                          <td style={{ fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            {formatTimeSafe(m.fecha || m.creado_en)}
                          </td>
                          <td>
                            <span className={`badge ${esIngreso ? "badge-success" : "badge-danger"}`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.concepto || m.motivo || m.descripcion || "Transacción"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: esIngreso ? "#34d399" : "#fb7185", whiteSpace: "nowrap" }}>
                            {esIngreso ? `+${formatMoney(m.monto)}` : `-${formatMoney(m.monto)}`}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        No hay movimientos registrados para esta sesión.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedSesion(null)} className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
