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
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Date Filter Bar */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <form
          onSubmit={handleApplyFilter}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
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

          <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
            <Filter size={16} />
            <span>Generar Reporte</span>
          </button>
        </form>
      </div>

      {/* KPI Cards for Selected Period */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div className="glass-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Ingresos Totales en Período
          </div>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#34d399" }}>
            {formatMoney(periodoData?.total_monto || periodoData?.monto_total)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Cantidad de Transacciones
          </div>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#f8fafc" }}>
            {periodoData?.total_ventas || periodoData?.cantidad_ventas || 0}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Ticket Promedio
          </div>
          <div style={{ fontSize: "26px", fontWeight: "800", color: "#38bdf8" }}>
            {formatMoney(
              (periodoData?.total_ventas || periodoData?.cantidad_ventas) > 0
                ? Math.round(
                    (periodoData?.total_monto || periodoData?.monto_total || 0) /
                      (periodoData?.total_ventas || periodoData?.cantidad_ventas)
                  )
                : 0
            )}
          </div>
        </div>
      </div>

      {/* Top 10 Best Selling Products */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <Award size={22} color="#f59e0b" />
          <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
            Ranking: Top 10 Productos Más Vendidos
          </h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "60px", textAlign: "center" }}>Rank</th>
                <th>Producto</th>
                <th style={{ textAlign: "center" }}>Unidades Vendidas</th>
                <th style={{ textAlign: "right" }}>Ingresos Totales</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Calculando ranking desde PostgreSQL Neon...
                  </td>
                </tr>
              ) : topProductos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No hay suficientes datos de ventas para el período seleccionado.
                  </td>
                </tr>
              ) : (
                topProductos.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "800",
                          fontSize: "12px",
                          background:
                            idx === 0
                              ? "rgba(245, 158, 11, 0.25)"
                              : idx === 1
                              ? "rgba(148, 163, 184, 0.2)"
                              : idx === 2
                              ? "rgba(180, 83, 9, 0.2)"
                              : "rgba(255, 255, 255, 0.05)",
                          color:
                            idx === 0
                              ? "#fbbf24"
                              : idx === 1
                              ? "#cbd5e1"
                              : idx === 2
                              ? "#f59e0b"
                              : "var(--text-secondary)",
                        }}
                      >
                        #{idx + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: "600", color: "#f8fafc" }}>
                      {p.nombre || p.producto_nombre}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "700", color: "#34d399" }}>
                      {p.total_cantidad || p.cantidad_vendida}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc" }}>
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
