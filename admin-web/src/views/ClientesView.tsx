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
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Search Bar */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <form
          onSubmit={handleSearch}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "14px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Buscar por Nombre, RUT o Teléfono
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "12px" }} />
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

          <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
            <Search size={16} />
            <span>Buscar Clientes</span>
          </button>
        </form>
      </div>

      {/* Clients Table */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
              Directorio de Clientes & Líneas de Crédito (Fiados)
            </h3>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Total: {paginacion.total} clientes registrados
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>RUT</th>
                <th>Nombre del Cliente</th>
                <th>Contacto</th>
                <th>Límite Crédito</th>
                <th>Saldo Deudor</th>
                <th>Estado Cuenta</th>
                <th>Ficha / Movimientos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando directorio de clientes...
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
                  const saldo = Number(c.saldo_deudor || c.saldo_actual) || 0;
                  const limite = Number(c.limite_credito) || 0;
                  const hasDebt = saldo > 0;

                  return (
                    <tr key={c.id || c.rut}>
                      <td style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--text-muted)" }}>
                        {c.rut || "S/R"}
                      </td>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>{c.nombre}</td>
                      <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {c.telefono || c.email || "Sin contacto"}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{formatMoney(limite)}</td>
                      <td style={{ fontWeight: "700", color: hasDebt ? "#fb7185" : "#34d399" }}>
                        {formatMoney(saldo)}
                      </td>
                      <td>
                        {hasDebt ? (
                          <span className="badge badge-danger">Con Deuda</span>
                        ) : (
                          <span className="badge badge-success">Al Día</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => openClienteFicha(c.id || c.sqlite_id)}
                          className="btn btn-secondary btn-sm"
                          title="Ver Cuenta Corriente"
                        >
                          <Eye size={14} />
                          <span>Ver Ficha</span>
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
                onClick={() => fetchClientes(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchClientes(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ficha y Cuenta Corriente de Cliente */}
      {selectedCliente && (
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
          onClick={() => setSelectedCliente(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "640px",
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
                <Users size={24} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                    {selectedCliente.cliente.nombre}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    RUT: {selectedCliente.cliente.rut || "No registrado"} • Tel: {selectedCliente.cliente.telefono || "N/A"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                backgroundColor: "rgba(0,0,0,0.25)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Saldo Deudor Actual</div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: (selectedCliente.cliente.saldo_deudor || 0) > 0 ? "#fb7185" : "#34d399" }}>
                  {formatMoney(selectedCliente.cliente.saldo_deudor || selectedCliente.cliente.saldo_actual)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Límite Autorizado</div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#f8fafc" }}>
                  {formatMoney(selectedCliente.cliente.limite_credito)}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Historial de Compras al Fiado y Abonos
            </h4>
            <div className="table-responsive">
              <table className="table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo Movimiento</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                    <th style={{ textAlign: "right" }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCliente.movimientos && selectedCliente.movimientos.length > 0 ? (
                    selectedCliente.movimientos.map((m: any, idx: number) => {
                      const isCargo = m.tipo === "cargo" || m.tipo === "venta";
                      return (
                        <tr key={idx}>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {new Date(m.fecha || m.creado_en).toLocaleDateString("es-CL")}
                          </td>
                          <td>
                            <span className={`badge ${isCargo ? "badge-danger" : "badge-success"}`}>
                              {isCargo ? "Cargo (+)" : "Abono (-)"}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-primary)" }}>{m.descripcion || "Transacción"}</td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: isCargo ? "#fb7185" : "#34d399" }}>
                            {formatMoney(m.monto)}
                          </td>
                          <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                            {formatMoney(m.saldo_posterior)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                        No hay movimientos registrados en la cuenta corriente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedCliente(null)} className="btn btn-secondary">
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
