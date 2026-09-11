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
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <form
          onSubmit={handleSearch}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: "14px",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Buscar por Código o Nombre
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "12px" }} />
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

          <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
            <Filter size={16} />
            <span>Filtrar</span>
          </button>
        </form>
      </div>

      {/* Product Catalog Table */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
              Catálogo de Productos & Precios
            </h3>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Total: {paginacion.total} productos registrados en Neon Cloud
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
                <th>Costo</th>
                <th>Precio Venta</th>
                <th>Margen (%)</th>
                <th>Stock Actual</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Cargando catálogo desde la nube...
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                productos.map((p) => {
                  const stock = Number(p.stock) || 0;
                  const stockMin = Number(p.stock_minimo) || 0;
                  const isLow = stock <= stockMin;
                  const margen = p.margen_porcentaje !== undefined
                    ? Number(p.margen_porcentaje)
                    : p.precio > 0
                    ? Math.round(((p.precio - (p.costo || 0)) / p.precio) * 100)
                    : 0;

                  return (
                    <tr key={p.id || p.codigo}>
                      <td style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--text-muted)" }}>
                        {p.codigo || "S/C"}
                      </td>
                      <td style={{ fontWeight: "600", color: "#f8fafc" }}>{p.nombre}</td>
                      <td>
                        <span className="badge badge-info">{p.categoria_nombre || "General"}</span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{formatMoney(p.costo)}</td>
                      <td style={{ fontWeight: "700", color: "#34d399" }}>{formatMoney(p.precio)}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "600",
                            fontSize: "12px",
                            color: margen >= 30 ? "#34d399" : margen > 0 ? "#fbbf24" : "#fb7185",
                          }}
                        >
                          <TrendingUp size={12} />
                          {margen}%
                        </span>
                      </td>
                      <td style={{ fontWeight: "700", color: isLow ? "#fb7185" : "#f8fafc" }}>
                        {stock}
                      </td>
                      <td>
                        {isLow ? (
                          <span className="badge badge-warning">
                            <AlertTriangle size={12} />
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="badge badge-success">Óptimo</span>
                        )}
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
                onClick={() => fetchData(paginacion.page - 1)}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <button
                disabled={paginacion.page >= paginacion.totalPages}
                onClick={() => fetchData(paginacion.page + 1)}
                className="btn btn-secondary btn-sm"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
