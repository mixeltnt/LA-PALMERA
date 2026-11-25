import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Users,
  CreditCard,
  Package,
  Calendar,
  Eye,
  ArrowUpRight,
  Receipt,
  X,
  Loader2
} from "lucide-react";
import { adminApi } from "../services/api";

interface DashboardProps {
  onViewVenta?: (id: number | string) => void;
  onNavigate?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ onViewVenta, onNavigate }) => {
  const [resumen, setResumen] = useState<any>(null);
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<any | null>(null);
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | number | null>(null);

  const openDetalleVenta = async (id: string | number) => {
    setLoadingDetalleId(id);
    try {
      const res = await adminApi.getVentaDetalle(id);
      setSelectedVenta(res);
    } catch (err: any) {
      alert("No se pudo cargar el detalle de la venta: " + (err?.message || "Error"));
    } finally {
      setLoadingDetalleId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, rec] = await Promise.all([
        adminApi.getDashboardResumen(),
        adminApi.getVentasRecientes(8),
      ]);
      setResumen(res);
      setVentasRecientes(rec || []);
    } catch (err: any) {
      setError(err?.message || "Error al cargar datos del Dashboard desde PostgreSQL Neon.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatMoney = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("es-CL")}`;
  };

  const formatDateTime = (dateStr?: string | null) => {
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

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
        <div style={{ fontSize: "15px", marginBottom: "12px" }}>Cargando métricas en vivo...</div>
        <div className="pulse-dot online" style={{ width: "12px", height: "12px", margin: "0 auto" }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {error && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#fb7185",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={16} color="#fb7185" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: "rgba(244, 63, 94, 0.4)", color: "#f8fafc", padding: "4px 12px" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Cards Grid (Responsive 4 -> 2 -> 1) */}
      <div className="kpi-grid">
        {/* Card 1: Ventas Hoy */}
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Ventas de Hoy
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DollarSign size={19} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(resumen?.montoHoy)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "#34d399" }}>
            <ShoppingBag size={14} />
            <span>{resumen?.totalVentasHoy || 0} transacciones hoy</span>
          </div>
        </div>

        {/* Card 2: Ventas del Mes */}
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Acumulado del Mes
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={19} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(resumen?.montoMes)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <Calendar size={14} />
            <span>{resumen?.totalVentasMes || 0} ventas registradas</span>
          </div>
        </div>

        {/* Card 3: Ticket Promedio */}
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Ticket Promedio
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={19} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(resumen?.ticketPromedio)}
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            Promedio por boleta emitida
          </div>
        </div>

        {/* Card 4: Deuda Clientes / Fiados */}
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Fiados Pendientes
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(244, 63, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={19} color="#fb7185" />
            </div>
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#fb7185", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(resumen?.totalDeudaClientes)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>{resumen?.clientesDeudores || 0} clientes con deuda activa</span>
          </div>
        </div>
      </div>

      {/* Main Content: Split Grid (2fr 1fr -> 1fr on mobile) */}
      <div className="split-grid">
        {/* Recent Sales Table */}
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                Últimas Ventas Sincronizadas
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Transmitidas en vivo desde SQLite hacia Neon Cloud
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("ventas")}
                className="btn btn-secondary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span>Ver Todas</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha y Hora</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                      No hay ventas recientes en la réplica remota.
                    </td>
                  </tr>
                ) : (
                  ventasRecientes.map((v, idx) => (
                    <tr key={v.id ?? v.sqlite_id ?? v.folio ?? `venta-${idx}`}>
                      <td>
                        <span style={{ fontWeight: "700", color: "#34d399" }}>#{v.folio || v.id || "---"}</span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatDateTime(v.creado_en || v.fecha)}
                      </td>
                      <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.cliente_nombre || "Cliente General"}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                          {v.metodo_pago || v.metodo_pago_principal || "Efectivo"}
                        </span>
                      </td>
                      <td style={{ fontWeight: "700", color: "#f8fafc", whiteSpace: "nowrap" }}>
                        {formatMoney(v.total)}
                      </td>
                      <td>
                        <button
                          onClick={() => openDetalleVenta(v.id || v.sqlite_id || v.folio)}
                          className="btn btn-secondary btn-sm"
                          title="Ver Detalle"
                          style={{ padding: "6px 10px" }}
                          disabled={loadingDetalleId === (v.id || v.sqlite_id || v.folio)}
                        >
                          {loadingDetalleId === (v.id || v.sqlite_id || v.folio) ? (
                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Alert & Architecture Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stock Alert Widget */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: (resumen?.productosBajoStock || 0) > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={18} color={(resumen?.productosBajoStock || 0) > 0 ? "#f59e0b" : "#10b981"} />
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>
                Alertas de Inventario
              </h4>
            </div>

            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
              {(resumen?.productosBajoStock || 0) > 0 ? (
                <span>
                  Hay <strong style={{ color: "#fbbf24" }}>{resumen.productosBajoStock}</strong> productos con stock bajo o igual al mínimo.
                </span>
              ) : (
                <span style={{ color: "#34d399" }}>
                  Todos los productos tienen niveles de stock saludables.
                </span>
              )}
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate("productos")}
                className="btn btn-secondary btn-sm"
                style={{ width: "100%" }}
              >
                <Package size={14} />
                <span>Revisar Catálogo</span>
              </button>
            )}
          </div>

          {/* Architecture Card */}
          <div
            className="glass-card"
            style={{
              padding: "20px",
              background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(11, 22, 17, 0.9) 100%)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ARQUITECTURA CERTIFICADA
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", margin: "6px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>SQLite Local</span>
              <span style={{ color: "#34d399" }}>→</span>
              <span>Neon Cloud</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Las ventas de tu caja son 100% autónomas. Este panel web refleja de forma pasiva y segura la réplica en la nube.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Detalle de Venta */}
      {selectedVenta && (() => {
        const venta = selectedVenta.venta || selectedVenta.data || selectedVenta;
        const items = selectedVenta.items || selectedVenta.data?.items || [];
        const dateVal = venta?.creado_en || venta?.fecha;
        const formattedDate = dateVal ? formatDateTime(dateVal) : "Fecha no disponible";

        return (
          <div className="modal-overlay" onClick={() => setSelectedVenta(null)}>
            <div className="modal-content" style={{ padding: "24px", maxWidth: "600px", width: "92%" }} onClick={(e) => e.stopPropagation()}>
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
                      {venta?.metodo_pago || venta?.metodo_pago_principal || "Efectivo"}
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
              <div className="table-responsive" style={{ marginBottom: "16px", maxHeight: "240px", overflowY: "auto" }}>
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
                  <span>{formatMoney(venta?.iva || venta?.impuesto_total)}</span>
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

              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                {onViewVenta && (
                  <button
                    onClick={() => {
                      const idToView = venta?.id || venta?.sqlite_id || venta?.folio;
                      setSelectedVenta(null);
                      if (idToView) onViewVenta(idToView);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", flex: 1, minWidth: "180px" }}
                  >
                    <span>Ver en módulo Ventas</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedVenta(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: onViewVenta ? "0 0 100px" : "1" }}
                >
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
