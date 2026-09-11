import React, { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt
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
    try {
      const res = await adminApi.getVentaDetalle(id);
      setSelectedVenta(res);
    } catch {
      alert("No se pudo cargar el detalle de la venta.");
    }
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
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
            gap: "14px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Buscar por Folio o Cliente
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "12px" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "36px" }}
                placeholder="Ej. 1004, Yasna..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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

          <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
            <Filter size={16} />
            <span>Filtrar</span>
          </button>
        </form>
      </div>

      {/* Ventas Table */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
              Registro de Ventas Sincronizadas
            </h3>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Total: {paginacion.total} transacciones
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
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {new Date(v.creado_en || v.fecha).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{v.cliente_nombre || "Cliente Ocasional"}</td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                        {v.metodo_pago || "Efectivo"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{formatMoney(v.subtotal)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatMoney(v.iva)}</td>
                    <td style={{ fontWeight: "700", color: "#f8fafc" }}>{formatMoney(v.total)}</td>
                    <td>
                      <button
                        onClick={() => openVentaDetalle(v.id || v.sqlite_id || v.folio)}
                        className="btn btn-secondary btn-sm"
                        title="Ver Boleta"
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
                onClick={() => fetchVentas(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchVentas(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalle de Venta */}
      {selectedVenta && (
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
          onClick={() => setSelectedVenta(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "580px",
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
                <Receipt size={24} color="#10b981" />
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                    Boleta Electrónica #{selectedVenta.venta.folio}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Sincronizada en PostgreSQL Neon
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVenta(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "13px",
                backgroundColor: "rgba(0,0,0,0.2)",
                padding: "14px",
                borderRadius: "var(--radius-md)",
                marginBottom: "20px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Fecha: </span>
                <span style={{ color: "#f8fafc", fontWeight: "600" }}>
                  {new Date(selectedVenta.venta.creado_en || selectedVenta.venta.fecha).toLocaleString("es-CL")}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Cliente: </span>
                <span style={{ color: "#f8fafc", fontWeight: "600" }}>
                  {selectedVenta.venta.cliente_nombre || "Cliente General"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Método: </span>
                <span className="badge badge-info" style={{ textTransform: "capitalize" }}>
                  {selectedVenta.venta.metodo_pago}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Estado: </span>
                <span className="badge badge-success">Completada</span>
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "10px" }}>
              Productos Vendidos
            </h4>
            <div className="table-responsive" style={{ marginBottom: "20px" }}>
              <table className="table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: "center" }}>Cant.</th>
                    <th style={{ textAlign: "right" }}>Precio</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVenta.items && selectedVenta.items.length > 0 ? (
                    selectedVenta.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td>{it.nombre || it.producto_nombre || "Producto"}</td>
                        <td style={{ textAlign: "center", fontWeight: "600" }}>{it.cantidad}</td>
                        <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatMoney(it.precio_unitario || it.precio)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#f8fafc" }}>
                          {formatMoney(it.subtotal || it.cantidad * (it.precio_unitario || it.precio))}
                        </td>
                      </tr>
                    ))
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
                paddingTop: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>Subtotal Neto:</span>
                <span>{formatMoney(selectedVenta.venta.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                <span>IVA (19%):</span>
                <span>{formatMoney(selectedVenta.venta.iva)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#34d399",
                  borderTop: "1px dashed var(--border-subtle)",
                  paddingTop: "10px",
                  marginTop: "4px",
                }}
              >
                <span>Total Pagado:</span>
                <span>{formatMoney(selectedVenta.venta.total)}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedVenta(null)} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
