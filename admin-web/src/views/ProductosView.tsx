import React, { useEffect, useState } from "react";
import { Search, AlertTriangle, Filter, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { adminApi } from "../services/api";

export const ProductosView: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [paginacion, setPaginacion] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [categoriaId, setCategoriaId] = useState<string>("");

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminApi.getProductos({
          page,
          limit: 15,
          search: search.trim() || undefined,
          categoria_id: categoriaId || undefined,
        }),
        adminApi.getCategorias(),
      ]);
      setProductos(prodRes.productos || []);
      setPaginacion(prodRes.paginacion || { page: 1, totalPages: 1, total: 0 });
      setCategorias(catRes.categorias || []);
    } catch (err) {
      console.error("Error cargando productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [categoriaId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1);
  };

  const formatMoney = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `$${num.toLocaleString("es-CL")}`;
  };

  return (
    <div className="page-container">
      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: "18px 20px" }}>
        <form onSubmit={handleSearch} className="filter-grid">
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Buscar por Código o Nombre
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "13px" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "36px" }}
                placeholder="Ej. 780..., Pan amasado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Categoría
            </label>
            <select
              className="form-control"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.total_productos || 0})
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ minWidth: "110px" }}>
            <Filter size={16} />
            <span>Filtrar</span>
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
              Catálogo de Productos & Precios
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Total: {paginacion.total} productos registrados
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del Producto</th>
                <th>Categoría</th>
                <th>Costo Compra</th>
                <th>Precio Venta</th>
                <th>Margen Ganancia</th>
                <th>Stock Actual</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando catálogo desde PostgreSQL Neon...
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No se encontraron productos registrados.
                  </td>
                </tr>
              ) : (
                productos.map((p) => {
                  const stockCritico = (p.stock_actual || 0) <= (p.stock_minimo || 0);
                  const margen =
                    p.precio_venta && p.precio_costo
                      ? Math.round(((p.precio_venta - p.precio_costo) / p.precio_costo) * 100)
                      : null;

                  return (
                    <tr key={p.id || p.codigo_barras}>
                      <td>
                        <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                          {p.codigo_barras || "S/C"}
                        </span>
                      </td>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {p.imagen_url ? (
                            <img
                              src={p.imagen_url}
                              alt=""
                              style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                              onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                          <span>{p.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{p.categoria_nombre || "General"}</span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatMoney(p.precio_costo)}
                      </td>
                      <td style={{ fontWeight: "700", color: "#34d399", whiteSpace: "nowrap" }}>
                        {formatMoney(p.precio_venta)}
                      </td>
                      <td>
                        {margen !== null ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: margen >= 30 ? "#34d399" : "#fbbf24", fontWeight: "600" }}>
                            <TrendingUp size={13} />
                            <span>{margen}%</span>
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>-</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontWeight: "700",
                              color: stockCritico ? "#fb7185" : "#f8fafc",
                            }}
                          >
                            {p.stock_actual || 0}
                          </span>
                          {stockCritico && (
                            <span title="Stock bajo el mínimo" style={{ display: "inline-flex" }}>
                              <AlertTriangle size={15} color="#fb7185" />
                            </span>
                          )}
                        </div>
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
                onClick={() => fetchData(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchData(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
