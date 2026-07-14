import { useEffect, useMemo, useState } from "react";

const defaultProducts = [
  {
    id: 1,
    codigo: "001",
    nombre: "Leche",
    categoria: "Lácteos",
    marca: "La Palmera",
    precioCompra: 800,
    precioVenta: 1200,
    stock: 24,
    stockMinimo: 8,
    proveedor: "Proveedor Local",
    codigoBarras: "1234567890123",
    estado: "Activo",
  },
];

function Productos() {
  const [products, setProducts] = useState(() => {
    const saved = window.localStorage.getItem("lapalmera-products");
    return saved ? JSON.parse(saved) : defaultProducts;
  });
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    categoria: "",
    marca: "",
    precioCompra: "",
    precioVenta: "",
    stock: "",
    stockMinimo: "",
    proveedor: "",
    codigoBarras: "",
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        search === "" ||
        [product.codigo, product.nombre, product.categoria, product.marca]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory = category === "" || product.categoria === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const handleToggleForm = () => {
    setShowForm((current) => !current);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    window.localStorage.setItem("lapalmera-products", JSON.stringify(products));
  }, [products]);

  const handleAddProduct = (event) => {
    event.preventDefault();
    if (
      !formData.codigo ||
      !formData.nombre ||
      !formData.categoria ||
      !formData.precioVenta ||
      !formData.stock
    ) {
      return;
    }

    const nextProduct = {
      id: Date.now(),
      ...formData,
      precioCompra: Number(formData.precioCompra || 0),
      precioVenta: Number(formData.precioVenta),
      stock: Number(formData.stock),
      stockMinimo: Number(formData.stockMinimo || 0),
      estado: Number(formData.stock) > 0 ? "Activo" : "Agotado",
    };

    setProducts((current) => [nextProduct, ...current]);
    setFormData({
      codigo: "",
      nombre: "",
      categoria: "",
      marca: "",
      precioCompra: "",
      precioVenta: "",
      stock: "",
      stockMinimo: "",
      proveedor: "",
      codigoBarras: "",
    });
    setShowForm(false);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-success">Productos</h2>
          <p className="text-muted">Gestión de productos y stock.</p>
        </div>
        <button className="btn btn-success" onClick={handleToggleForm}>
          {showForm ? "Cerrar formulario" : "+ Agregar producto"}
        </button>
      </div>

      {showForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-4">Nuevo producto</h5>
            <form onSubmit={handleAddProduct}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Código</label>
                  <input
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Nombre</label>
                  <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Categoría</label>
                  <input
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Marca</label>
                  <input
                    name="marca"
                    value={formData.marca}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Precio compra</label>
                  <input
                    name="precioCompra"
                    value={formData.precioCompra}
                    onChange={handleChange}
                    type="number"
                    className="form-control"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Precio venta</label>
                  <input
                    name="precioVenta"
                    value={formData.precioVenta}
                    onChange={handleChange}
                    type="number"
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Stock</label>
                  <input
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    type="number"
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Stock mínimo</label>
                  <input
                    name="stockMinimo"
                    value={formData.stockMinimo}
                    onChange={handleChange}
                    type="number"
                    className="form-control"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Proveedor</label>
                  <input
                    name="proveedor"
                    value={formData.proveedor}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Código de barras</label>
                  <input
                    name="codigoBarras"
                    value={formData.codigoBarras}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="mt-4 text-end">
                <button type="submit" className="btn btn-success">
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Buscar producto"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Todas las categorías</option>
                <option value="Lácteos">Lácteos</option>
                <option value="Alimentos">Alimentos</option>
                <option value="Snacks">Snacks</option>
                <option value="Bebidas">Bebidas</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio venta</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.codigo}</td>
                    <td>{product.nombre}</td>
                    <td>{product.categoria}</td>
                    <td>${product.precioVenta.toLocaleString("es-CL")}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span
                        className={`badge ${
                          product.estado === "Activo"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {product.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        disabled
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Productos;
