import React, { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Package,
  RotateCcw
} from "lucide-react";
import { adminApi } from "../services/api";

interface VentasViewProps {
  initialVentaId?: string | number | null;
  onClearInitialVentaId?: () => void;
}

export const VentasView: React.FC<VentasViewProps> = ({
  initialVentaId,
  onClearInitialVentaId,
}) => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [paginacion, setPaginacion] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal State
  const [selectedVenta, setSelectedVenta] = useState<any | null>(null);

  const fetchVentas = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getVentas({
        page,
        limit: 15,
        search: search.trim() || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        metodo_pago: metodoPago || undefined,
      });
      setVentas(res.ventas || []);
      setPaginacion(res.paginacion || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Error al cargar ventas:", err);
    } finally {
      setLoading(false);
    }
  };

  const openVentaDetalle = async (id: string | number) => {
    setModalError(null);
    try {
      const res = await adminApi.getVentaDetalle(id);
      setSelectedVenta(res);
    } catch (err: any) {
      setModalError(err?.message || "No se pudo cargar el detalle de la venta.");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDesde("");
    setHasta("");
    setMetodoPago("");
  };

  useEffect(() => {
    fetchVentas(1);
  }, [desde, hasta, metodoPago]);

  useEffect(() => {
    if (initialVentaId) {
      openVentaDetalle(initialVentaId);
      if (onClearInitialVentaId) onClearInitialVentaId();
    }
  }, [initialVentaId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVentas(1);
  };

  const formatMoney = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("es-CL")}`;
  };

  return (
    <div className="page-container">
      {modalError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#fb7185",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{modalError}</span>
          <button
            onClick={() => setModalError(null)}
            style={{ background: "transparent", border: "none", color: "#fb7185", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: "18px 20px" }}>
        <form onSubmit={handleSearchSubmit} className="filter-grid">
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Buscar por Folio o Cliente
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "13px" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "36px", paddingRight: search ? "32px" : "12px" }}
                placeholder="Ej. 1004, Yasna..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "12px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Desde
            </label>
            <input
              type="date"
              className="form-control"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Hasta
            </label>
            <input
              type="date"
              className="form-control"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Método de Pago
            </label>
            <select
              className="form-control"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="fiado">Fiado (Cuenta)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, minWidth: "90px" }}>
              <Filter size={16} />
              <span>Filtrar</span>
            </button>
            {(search || desde || hasta || metodoPago) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
                title="Limpiar filtros"
                style={{ padding: "10px" }}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Ventas Table */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
              Registro de Ventas Sincronizadas
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Total: {paginacion.total} transacciones en Neon Cloud
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha / Hora</th>
                <th>Cliente</th>
                <th>Método de Pago</th>
                <th>Subtotal</th>
                <th>IVA (19%)</th>
                <th>Total</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando ventas desde PostgreSQL Neon...
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No se encontraron ventas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id || v.folio}>
                    <td>
                      <span style={{ fontWeight: "700", color: "#34d399" }}>#{v.folio}</span>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(v.fecha || v.creado_en).toLocaleString("es-CL", {
                        timeZone: "America/Santiago",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.cliente_nombre || "Cliente Ocasional"}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                        {v.metodo_pago || v.metodo_pago_principal || "Efectivo"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatMoney(v.subtotal)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>{formatMoney(v.iva ?? v.impuesto_total)}</td>
                    <td style={{ fontWeight: "700", color: "#f8fafc", whiteSpace: "nowrap" }}>{formatMoney(v.total)}</td>
                    <td>
                      <button
                        onClick={() => openVentaDetalle(v.id || v.sqlite_id || v.folio)}
                        className="btn btn-secondary btn-sm"
                        title="Ver Boleta"
                        style={{ padding: "6px 10px" }}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
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
                onClick={() => fetchVentas(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchVentas(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalle de Venta (Responsive Bottom Sheet / Modal) */}
      {selectedVenta && (() => {
        const venta = selectedVenta.venta || selectedVenta.data || selectedVenta;
        const items = selectedVenta.items || selectedVenta.data?.items || [];
        const dateVal = venta?.creado_en || venta?.fecha;
        const formattedDate = dateVal ? new Date(dateVal).toLocaleString("es-CL") : "Fecha no disponible";

        return (
          <div className="modal-overlay" onClick={() => setSelectedVenta(null)}>
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
                  <Receipt size={22} color="#10b981" />
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
                      Boleta #{venta?.folio || venta?.id || "---"}
                    </h3>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Sincronizada en PostgreSQL Neon
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVenta(null)}
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  fontSize: "12px",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Fecha: </span>
                  <div style={{ color: "#f8fafc", fontWeight: "600", marginTop: "2px" }}>
                    {formattedDate}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Cliente: </span>
                  <div style={{ color: "#f8fafc", fontWeight: "600", marginTop: "2px" }}>
                    {venta?.cliente_nombre || "Cliente General"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Método: </span>
                  <div>
                    <span className="badge badge-info" style={{ textTransform: "capitalize", marginTop: "2px" }}>
                      {venta?.metodo_pago || "Efectivo"}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Estado: </span>
                  <div>
                    <span className="badge badge-success" style={{ marginTop: "2px" }}>
                      {venta?.estado || "Completada"}
                    </span>
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "8px" }}>
                Productos en la Boleta
              </h4>
              <div className="table-responsive" style={{ marginBottom: "16px" }}>
                <table className="table" style={{ fontSize: "12px", minWidth: "360px" }}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: "center" }}>Cant.</th>
                      <th style={{ textAlign: "right" }}>Precio</th>
                      <th style={{ textAlign: "right" }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items && items.length > 0 ? (
                      items.map((it: any, idx: number) => {
                        const imgUrl = it.imagen_url || it.imagen || it.p_imagen_url || it.producto?.imagen_url || it.producto?.imagen;
                        const isWeight = Number(it.cantidad) % 1 !== 0;
                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    style={{
                                      width: "36px",
                                      height: "36px",
                                      borderRadius: "8px",
                                      objectFit: "cover",
                                      flexShrink: 0,
                                      border: "1px solid var(--border-subtle)",
                                      backgroundColor: "rgba(255,255,255,0.04)",
                                    }}
                                    onError={(e: any) => {
                                      e.currentTarget.style.display = "none";
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = "flex";
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    border: "1px solid var(--border-subtle)",
                                    display: imgUrl ? "none" : "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  <Package size={17} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: "600", color: "#f8fafc" }}>
                                    {it.nombre || it.producto_nombre || "Producto"}
                                  </div>
                                  {(it.codigo || it.producto_codigo) && (
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                      Cód: {it.codigo || it.producto_codigo}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: "600", whiteSpace: "nowrap" }}>
                              {it.cantidad} {isWeight ? "kg" : "u."}
                            </td>
                            <td style={{ textAlign: "right", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                              {formatMoney(it.precio_unitario || it.precio)}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc", whiteSpace: "nowrap" }}>
                              {formatMoney(it.subtotal || (Number(it.cantidad || 1) * Number(it.precio_unitario || it.precio || 0)))}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                          Sin detalle de productos desglosados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "13px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                  <span>Subtotal Neto:</span>
                  <span>{formatMoney(venta?.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>IVA (19%):</span>
                  <span>{formatMoney(venta?.iva)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#34d399",
                    borderTop: "1px dashed var(--border-subtle)",
                    paddingTop: "8px",
                    marginTop: "4px",
                  }}
                >
                  <span>Total Pagado:</span>
                  <span>{formatMoney(venta?.total)}</span>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setSelectedVenta(null)} className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
