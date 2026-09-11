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

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Caja Table */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
              Historial de Turnos y Arqueos de Caja
            </h3>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Sesiones de caja registradas y sincronizadas desde SQLite
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
                <th>Monto Apertura</th>
                <th>Ventas Totales</th>
                <th>Monto Cierre</th>
                <th>Diferencia / Arqueo</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando turnos de caja desde Neon Cloud...
                  </td>
                </tr>
              ) : sesiones.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No hay turnos de caja registrados.
                  </td>
                </tr>
              ) : (
                sesiones.map((s) => {
                  const isOpen = s.estado === "abierta" || !s.fecha_cierre;
                  const diferencia = Number(s.diferencia) || 0;

                  return (
                    <tr key={s.id || s.sqlite_id}>
                      <td style={{ fontWeight: "700", color: "#34d399" }}>#{s.id || s.sqlite_id}</td>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>{s.usuario_nombre || s.usuario_id || "Cajero"}</td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {new Date(s.fecha_apertura).toLocaleString("es-CL", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {s.fecha_cierre
                          ? new Date(s.fecha_cierre).toLocaleString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "En curso..."}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{formatMoney(s.monto_apertura)}</td>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>{formatMoney(s.total_ventas)}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {s.monto_cierre !== null ? formatMoney(s.monto_cierre) : "-"}
                      </td>
                      <td>
                        {!isOpen ? (
                          <span
                            style={{
                              fontWeight: "700",
                              color: diferencia === 0 ? "#34d399" : diferencia > 0 ? "#38bdf8" : "#fb7185",
                            }}
                          >
                            {diferencia > 0 ? `+${formatMoney(diferencia)}` : formatMoney(diferencia)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>-</span>
                        )}
                      </td>
                      <td>
                        {isOpen ? (
                          <span className="badge badge-success">Abierta</span>
                        ) : (
                          <span className="badge badge-info">Cerrada</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => openSesionDetalle(s.id || s.sqlite_id)}
                          className="btn btn-secondary btn-sm"
                          title="Ver Movimientos"
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
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Página {paginacion.page} de {paginacion.totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                disabled={paginacion.page <= 1}
                onClick={() => fetchSesiones(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchSesiones(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalle Sesion de Caja */}
      {selectedSesion && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
          onClick={() => setSelectedSesion(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              backgroundColor: "#11201b",
              padding: "28px",
              borderRadius: "var(--radius-xl)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Wallet size={24} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                    Detalle de Turno #{selectedSesion.sesion.id || selectedSesion.sesion.sqlite_id}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Cajero: {selectedSesion.sesion.usuario_nombre || "Usuario"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSesion(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                backgroundColor: "rgba(0,0,0,0.25)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Apertura</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                  {formatMoney(selectedSesion.sesion.monto_apertura)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Ventas Efectivo</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#34d399" }}>
                  {formatMoney(selectedSesion.sesion.total_ventas_efectivo || selectedSesion.sesion.total_ventas)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Cierre Reportado</div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                  {formatMoney(selectedSesion.sesion.monto_cierre)}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Movimientos de Caja (Entradas / Salidas / Retiros)
            </h4>
            <div className="table-responsive">
              <table className="table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSesion.movimientos && selectedSesion.movimientos.length > 0 ? (
                    selectedSesion.movimientos.map((m: any, idx: number) => {
                      const isIngreso = m.tipo === "ingreso" || m.tipo === "apertura";
                      return (
                        <tr key={idx}>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {new Date(m.creado_en || m.fecha).toLocaleTimeString("es-CL")}
                          </td>
                          <td>
                            <span className={`badge ${isIngreso ? "badge-success" : "badge-danger"}`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-primary)" }}>{m.motivo || m.descripcion || "Movimiento"}</td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: isIngreso ? "#34d399" : "#fb7185" }}>
                            {formatMoney(m.monto)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)" }}>
                        No se registraron movimientos manuales adicionales durante el turno.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedSesion(null)} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
