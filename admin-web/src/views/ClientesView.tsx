import React, { useEffect, useState } from "react";
import { Search, Users, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "../services/api";

export const ClientesView: React.FC = () => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [paginacion, setPaginacion] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modal State
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);

  const fetchClientes = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getClientes({
        page,
        limit: 15,
        search: search.trim() || undefined,
      });
      setClientes(res.clientes || []);
      setPaginacion(res.paginacion || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Error cargando clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  const openClienteFicha = async (id: string | number) => {
    try {
      const res = await adminApi.getClienteMovimientos(id);
      setSelectedCliente(res);
    } catch {
      alert("No se pudo cargar la cuenta corriente del cliente.");
    }
  };

  useEffect(() => {
    fetchClientes(1);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClientes(1);
  };

  const formatMoney = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("es-CL")}`;
  };

  return (
    <div className="page-container">
      {/* Search Bar */}
      <div className="glass-card" style={{ padding: "18px 20px" }}>
        <form onSubmit={handleSearch} className="filter-grid">
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Buscar por Nombre, RUT o Teléfono
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "13px" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "36px" }}
                placeholder="Ej. Juan Pérez, 12.345.678-9..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ minWidth: "110px" }}>
            <Search size={16} />
            <span>Buscar</span>
          </button>
        </form>
      </div>

      {/* Clientes Table */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
              Cartera de Clientes & Cuentas Fiadas
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Total: {paginacion.total} clientes registrados
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Teléfono</th>
                <th>Límite Crédito</th>
                <th>Saldo Deudor</th>
                <th>Estado Fiado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando clientes desde PostgreSQL Neon...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const tieneDeuda = (c.saldo_deudor || 0) > 0;
                  return (
                    <tr key={c.id || c.rut}>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>{c.nombre}</td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {c.rut || "-"}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.telefono || "-"}</td>
                      <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatMoney(c.limite_credito)}
                      </td>
                      <td style={{ fontWeight: "700", color: tieneDeuda ? "#fb7185" : "#34d399", whiteSpace: "nowrap" }}>
                        {formatMoney(c.saldo_deudor)}
                      </td>
                      <td>
                        {(c.permite_credito ?? (Number(c.limite_credito || 0) > 0 || c.activo !== false)) ? (
                          <span className="badge badge-success">Habilitado</span>
                        ) : (
                          <span className="badge badge-danger">Bloqueado</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => openClienteFicha(c.id || c.sqlite_id)}
                          className="btn btn-secondary btn-sm"
                          title="Ver Cuenta Corriente"
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
                onClick={() => fetchClientes(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchClientes(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Cuenta Corriente & Movimientos (Responsive Bottom Sheet) */}
      {selectedCliente && (
        <div className="modal-overlay" onClick={() => setSelectedCliente(null)}>
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
                <Users size={22} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
                    {selectedCliente.cliente?.nombre}
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    RUT: {selectedCliente.cliente?.rut || "Sin RUT"} • Tel: {selectedCliente.cliente?.telefono || "N/A"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
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

            {/* Saldo summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                padding: "12px",
                backgroundColor: "rgba(0,0,0,0.25)",
                borderRadius: "var(--radius-md)",
                marginBottom: "16px",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Saldo Deuda Actual:</span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#fb7185" }}>
                  {formatMoney(selectedCliente.cliente?.saldo_deudor)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Límite de Crédito:</span>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-secondary)" }}>
                  {formatMoney(selectedCliente.cliente?.limite_credito)}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "8px" }}>
              Movimientos (Cargos y Abonos)
            </h4>
            <div className="table-responsive" style={{ marginBottom: "16px" }}>
              <table className="table" style={{ fontSize: "12px", minWidth: "360px" }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                    <th style={{ textAlign: "right" }}>Saldo Result.</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCliente.movimientos && selectedCliente.movimientos.length > 0 ? (
                    selectedCliente.movimientos.map((m: any, idx: number) => {
                      const rawTipo = String(m.tipo_movimiento || m.tipo || "").toUpperCase();
                      const esCargo = rawTipo === "CARGO" || rawTipo === "VENTA" || rawTipo === "VENTA_FIADA";
                      return (
                        <tr key={idx}>
                          <td style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                            {new Date(m.fecha || m.creado_en).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}
                          </td>
                          <td>
                            <span className={`badge ${esCargo ? "badge-danger" : "badge-success"}`}>
                              {m.tipo_movimiento || m.tipo}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: esCargo ? "#fb7185" : "#34d399" }}>
                            {esCargo ? `+${formatMoney(m.monto)}` : `-${formatMoney(m.monto)}`}
                          </td>
                          <td style={{ textAlign: "right", color: "#f8fafc" }}>
                            {formatMoney(m.saldo_resultante ?? m.saldo_posterior ?? m.saldo)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        No hay movimientos registrados en la réplica remota.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedCliente(null)} className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
