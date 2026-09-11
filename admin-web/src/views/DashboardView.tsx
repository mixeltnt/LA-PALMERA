import React, { useEffect, useState } from "react";
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
  ArrowUpRight
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

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        <div style={{ fontSize: "16px", marginBottom: "12px" }}>Cargando métricas desde Neon Cloud...</div>
        <div className="pulse-dot online" style={{ width: "12px", height: "12px" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>
      {error && (
        <div
          style={{
            padding: "16px",
            borderRadius: "var(--radius-md)",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#fb7185",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Card 1: Ventas Hoy */}
        <div className="glass-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
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
              <DollarSign size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px" }}>
            {formatMoney(resumen?.montoHoy)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "#34d399" }}>
            <ShoppingBag size={14} />
            <span>{resumen?.totalVentasHoy || 0} transacciones hoy</span>
          </div>
        </div>

        {/* Card 2: Ventas del Mes */}
        <div className="glass-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
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
              <TrendingUp size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px" }}>
            {formatMoney(resumen?.montoMes)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <Calendar size={14} />
            <span>{resumen?.totalVentasMes || 0} ventas registradas</span>
          </div>
        </div>

        {/* Card 3: Ticket Promedio */}
        <div className="glass-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
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
              <CreditCard size={20} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", letterSpacing: "-0.5px" }}>
            {formatMoney(resumen?.ticketPromedio)}
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            Promedio por boleta emitida
          </div>
        </div>

        {/* Card 4: Deuda Clientes / Fiados */}
        <div className="glass-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
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
              <Users size={20} color="#fb7185" />
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#fb7185", letterSpacing: "-0.5px" }}>
            {formatMoney(resumen?.totalDeudaClientes)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>{resumen?.clientesDeudores || 0} clientes con deuda activa</span>
          </div>
        </div>
      </div>

      {/* Main Content: Recent Sales & Quick Shortcuts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Recent Sales Table */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                Últimas Ventas Sincronizadas
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Transmitidas en tiempo real desde SQLite hacia Neon Cloud
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
                    <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                      No hay ventas recientes en la réplica remota.
                    </td>
                  </tr>
                ) : (
                  ventasRecientes.map((v) => (
                    <tr key={v.id || v.folio}>
                      <td>
                        <span style={{ fontWeight: "700", color: "#34d399" }}>#{v.folio}</span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {new Date(v.creado_en || v.fecha).toLocaleString("es-CL", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{v.cliente_nombre || "Cliente General"}</td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                          {v.metodo_pago || "Efectivo"}
                        </span>
                      </td>
                      <td style={{ fontWeight: "700", color: "#f8fafc" }}>
                        {formatMoney(v.total)}
                      </td>
                      <td>
                        {onViewVenta && (
                          <button
                            onClick={() => onViewVenta(v.id || v.sqlite_id || v.folio)}
                            className="btn btn-secondary btn-sm"
                            title="Ver Detalle"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock & Operational Status Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Stock Alert Widget */}
          <div className="glass-card" style={{ padding: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: (resumen?.productosBajoStock || 0) > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                Revisar Catálogo
              </button>
            )}
          </div>

          {/* Architecture Reminder Card */}
          <div
            className="glass-card"
            style={{
              padding: "20px",
              background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(11, 22, 17, 0.9) 100%)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Arquitectura Certificada
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc", margin: "6px 0" }}>
              SQLite Local ? Neon Cloud
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Las ventas de tu caja son 100% autónomas. Este panel web refleja de forma pasiva y segura la réplica en la nube.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
