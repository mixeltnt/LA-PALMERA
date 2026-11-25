import React, { useEffect, useState } from "react";
import { Award, Filter } from "lucide-react";
import { adminApi } from "../services/api";

export const ReportesView: React.FC = () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const firstDayMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [desde, setDesde] = useState<string>(firstDayMonthStr);
  const [hasta, setHasta] = useState<string>(todayStr);
  const [periodoData, setPeriodoData] = useState<any>(null);
  const [topProductos, setTopProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReportes = async () => {
    setLoading(true);
    try {
      const [perRes, topRes] = await Promise.all([
        adminApi.getReportePeriodo(desde, hasta),
        adminApi.getTopProductos(desde, hasta, 10),
      ]);
      setPeriodoData(perRes);
      setTopProductos(topRes || []);
    } catch (err) {
      console.error("Error al cargar reportes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReportes();
  };

  const formatMoney = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("es-CL")}`;
  };

  return (
    <div className="page-container">
      {/* Date Filter Bar */}
      <div className="glass-card" style={{ padding: "18px 20px" }}>
        <form onSubmit={handleApplyFilter} className="filter-grid">
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Fecha Desde
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
              Fecha Hasta
            </label>
            <input
              type="date"
              className="form-control"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ minWidth: "140px" }}>
            <Filter size={16} />
            <span>Generar Reporte</span>
          </button>
        </form>
      </div>

      {/* KPI Cards for Selected Period */}
      <div className="kpi-grid">
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Ingresos Totales en Período
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#34d399", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(periodoData?.totalMonto ?? periodoData?.total_monto ?? 0)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Ventas brutas recaudadas
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Boletas Emitidas
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {periodoData?.totalVentas ?? periodoData?.total_transacciones ?? 0}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Transacciones completadas
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Subtotal Neto Estimado
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#fbbf24", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(
              periodoData?.totalSubtotal ??
              Math.round((Number(periodoData?.totalMonto ?? periodoData?.total_monto ?? 0)) / 1.19)
            )}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Sin IVA acumulado
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            IVA Débito Fiscal (19%)
          </div>
          <div style={{ fontSize: "clamp(17px, 4.8vw, 26px)", fontWeight: "800", color: "#38bdf8", letterSpacing: "-0.5px", overflowWrap: "anywhere" }}>
            {formatMoney(
              periodoData?.totalIva ??
              Math.round((Number(periodoData?.totalMonto ?? periodoData?.total_monto ?? 0)) - ((Number(periodoData?.totalMonto ?? periodoData?.total_monto ?? 0)) / 1.19))
            )}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Impuesto al valor agregado
          </div>
        </div>
      </div>

      {/* Top 10 Most Sold Products Table */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Award size={20} color="#f59e0b" />
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
            Top 10 Productos Más Vendidos en el Período
          </h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre del Producto</th>
                <th style={{ textAlign: "center" }}>Unidades Vendidas</th>
                <th style={{ textAlign: "right" }}>Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Calculando ranking de productos...
                  </td>
                </tr>
              ) : topProductos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No hay ventas registradas para el rango de fechas seleccionado.
                  </td>
                </tr>
              ) : (
                topProductos.map((p, index) => (
                  <tr key={index}>
                    <td>
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: index < 3 ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.06)",
                          color: index < 3 ? "#fbbf24" : "var(--text-secondary)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "12px",
                        }}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: "600", color: "#f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border-subtle)" }}
                            onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : null}
                        <span>{p.nombre || p.producto_nombre}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "700", color: "#34d399" }}>
                      {p.total_vendido || p.cantidad} u.
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc", whiteSpace: "nowrap" }}>
                      {formatMoney(p.total_recaudado || p.monto_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
