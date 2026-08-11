import { useCallback, useEffect, useMemo, useState } from "react";
import productService from "../../services/productService";

function Inventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await productService.listar({ limit: 100, activo: "true" });
      setProductos(Array.isArray(data.productos) ? data.productos : []);
    } catch (err) {
      setProductos([]);
      setError(err?.message || "No fue posible cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarProductos();
  }, [cargarProductos]);

  const categorias = useMemo(() => {
    const valores = productos
      .map(
        (producto) =>
          producto.categoria?.nombre ||
          producto.categoriaNombre ||
          producto.categoria,
      )
      .filter(Boolean);

    return [...new Set(valores)].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const texto = search.trim().toLowerCase();

    return productos.filter((producto) => {
      const codigo = String(producto.codigo || "").toLowerCase();
      const nombre = String(producto.nombre || "").toLowerCase();
      const categoriaNombre =
        producto.categoria?.nombre ||
        producto.categoriaNombre ||
        producto.categoria ||
        "";

      const coincideBusqueda =
        !texto || codigo.includes(texto) || nombre.includes(texto);
      const coincideCategoria =
        categoria === "todas" || categoriaNombre === categoria;

      return coincideBusqueda && coincideCategoria;
    });
  }, [categoria, productos, search]);

  const resumen = useMemo(() => {
    return productosFiltrados.reduce(
      (acc, producto) => {
        const stockActual = Number(producto.stockActual) || 0;
        const stockMinimo = Number(producto.stockMinimo) || 0;

        acc.total += 1;

        if (stockActual === 0) {
          acc.sinStock += 1;
        } else if (stockActual <= stockMinimo) {
          acc.stockBajo += 1;
        } else {
          acc.stockNormal += 1;
        }

        return acc;
      },
      { total: 0, stockNormal: 0, stockBajo: 0, sinStock: 0 },
    );
  }, [productosFiltrados]);

  const formatPrice = useCallback((value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  }, []);

  const getStockState = useCallback((stockActual, stockMinimo) => {
    const stock = Number(stockActual) || 0;
    const minimo = Number(stockMinimo) || 0;

    if (stock === 0) {
      return { label: "SIN STOCK", className: "bg-danger" };
    }

    if (stock <= minimo) {
      return { label: "STOCK BAJO", className: "bg-warning text-dark" };
    }

    return { label: "STOCK NORMAL", className: "bg-success" };
  }, []);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-success mb-2">Inventario</h2>
          <p className="text-muted mb-0">
            Estado real del stock basado en los productos registrados en
            MongoDB.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={cargarProductos}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-body">
              <p className="text-muted small mb-1">Total de productos</p>
              <h3 className="fw-bold mb-0">{resumen.total}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-body">
              <p className="text-muted small mb-1">Stock normal</p>
              <h3 className="fw-bold mb-0 text-success">
                {resumen.stockNormal}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-body">
              <p className="text-muted small mb-1">Stock bajo</p>
              <h3 className="fw-bold mb-0 text-warning">{resumen.stockBajo}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-body">
              <p className="text-muted small mb-1">Sin stock</p>
              <h3 className="fw-bold mb-0 text-danger">{resumen.sinStock}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-7">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Buscar por nombre o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-5">
              <select
                className="form-select"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={categorias.length === 0}
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger shadow-sm" role="alert">
          <strong>No fue posible cargar el inventario.</strong> {error}
        </div>
      ) : null}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center text-muted">
              <div
                className="spinner-border text-success mb-3"
                role="status"
                aria-hidden="true"
              ></div>
              <div>Cargando productos...</div>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              <p className="mb-0">
                No hay productos que coincidan con los filtros actuales.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="text-center">Stock actual</th>
                    <th className="text-center">Stock mínimo</th>
                    <th className="text-end">Precio compra</th>
                    <th className="text-end">Precio venta</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => {
                    const categoriaNombre =
                      producto.categoria?.nombre ||
                      producto.categoriaNombre ||
                      producto.categoria ||
                      "—";
                    const stockActual = Number(producto.stockActual) || 0;
                    const stockMinimo = Number(producto.stockMinimo) || 0;
                    const estado = getStockState(stockActual, stockMinimo);

                    return (
                      <tr key={producto._id}>
                        <td className="fw-semibold">
                          {producto.codigo || "—"}
                        </td>
                        <td className="fw-semibold">
                          {producto.nombre || "—"}
                        </td>
                        <td>{categoriaNombre}</td>
                        <td className="text-center">{stockActual}</td>
                        <td className="text-center">{stockMinimo}</td>
                        <td className="text-end">
                          {formatPrice(producto.precioCompra)}
                        </td>
                        <td className="text-end">
                          {formatPrice(producto.precioVenta)}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${estado.className}`}>
                            {estado.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Inventario;
