import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import productService from "../../services/productService";
import clientService from "../../services/clientService";
import ventaService from "../../services/ventaService";

const emptyForm = {
  cliente: "",
  metodoPago: "EFECTIVO",
  observaciones: "",
  descuento: "0",
};

function Ventas() {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [ventaId, setVentaId] = useState(null);
  const [numeroVenta, setNumeroVenta] = useState(null);

  const formatPrice = useCallback((value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  }, []);

  const cargarProductos = useCallback(async (term = "") => {
    setLoadingProductos(true);
    try {
      const data = await productService.listar({
        search: term,
        limit: 12,
        activo: "true",
      });
      setProductos(data.productos || []);
    } catch {
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const cargarClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const data = await clientService.listar({ limit: 100, activo: "true" });
      setClientes(data.clientes || []);
    } catch {
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  useEffect(() => {
    void cargarProductos("");
    void cargarClientes();
  }, [cargarProductos, cargarClientes]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarProductos(search.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search, cargarProductos]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    [cart],
  );

  const descuento = useMemo(
    () => Number(form.descuento || 0),
    [form.descuento],
  );

  const total = useMemo(() => {
    const calculated = subtotal - descuento;
    return calculated > 0 ? calculated : 0;
  }, [subtotal, descuento]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const syncCartLine = (line, qty) => {
    const cantidad = Math.min(
      Math.max(Number.isFinite(qty) ? qty : 1, 1),
      Number(line.stockActual) || 1,
    );
    const subtotalLinea = cantidad * Number(line.precioUnitario || 0);
    return {
      ...line,
      cantidad,
      subtotal: subtotalLinea,
    };
  };

  const agregarProducto = (producto) => {
    if (!producto?.activo || Number(producto.stockActual) <= 0) {
      setError("No se puede agregar un producto sin stock disponible.");
      return;
    }

    let blocked = false;
    setCart((prev) => {
      const existente = prev.find((item) => item._id === producto._id);
      if (!existente) {
        return [
          ...prev,
          {
            _id: producto._id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            stockActual: Number(producto.stockActual),
            precioUnitario: Number(producto.precioVenta || 0),
            cantidad: 1,
            descuento: 0,
            subtotal: Number(producto.precioVenta || 0),
          },
        ];
      }

      if (Number(existente.cantidad) >= Number(existente.stockActual)) {
        setError("No hay más stock disponible para este producto.");
        blocked = true;
        return prev;
      }

      return prev.map((item) =>
        item._id === producto._id
          ? syncCartLine(item, Number(item.cantidad) + 1)
          : item,
      );
    });
    if (!blocked) {
      setError("");
    }
  };

  const cambiarCantidad = (id, value) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === id ? syncCartLine(item, Number(value)) : item,
      ),
    );
    setError("");
  };

  const eliminarProducto = (id) => {
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  const validarFormulario = () => {
    const errores = [];

    if (!cart.length) {
      errores.push("Agrega al menos un producto al carrito.");
    }

    if (descuento < 0) {
      errores.push("El descuento no puede ser negativo.");
    }

    if (descuento > subtotal) {
      errores.push("El descuento no puede ser mayor que el subtotal.");
    }

    if (!form.metodoPago.trim()) {
      errores.push("El método de pago es obligatorio.");
    }

    cart.forEach((item, index) => {
      if (!item._id) {
        errores.push(`La línea ${index + 1} no tiene producto.`);
      }
      if (
        !Number.isFinite(Number(item.cantidad)) ||
        Number(item.cantidad) <= 0
      ) {
        errores.push(
          `La cantidad de la línea ${index + 1} debe ser mayor a 0.`,
        );
      }
      if (Number(item.cantidad) > Number(item.stockActual)) {
        errores.push(`No hay stock suficiente para ${item.nombre}.`);
      }
    });

    return errores;
  };

  const construirPayload = () => ({
    cliente: form.cliente || null,
    metodoPago: form.metodoPago,
    observaciones: form.observaciones,
    descuento: Number(form.descuento || 0),
    productos: cart.map((item) => ({
      producto: item._id,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
      descuento: Number(item.descuento || 0),
    })),
  });

  const limpiarFormulario = () => {
    setCart([]);
    setForm(emptyForm);
    setError("");
    setVentaId(null);
    setNumeroVenta(null);
  };

  const guardarBorrador = async () => {
    const errores = validarFormulario();
    if (errores.length > 0) {
      setError(errores.join(". "));
      return;
    }

    setSaving(true);
    try {
      const payload = construirPayload();
      const respuesta = ventaId
        ? await ventaService.actualizar(ventaId, payload)
        : await ventaService.crear(payload);

      setVentaId(respuesta._id);
      setNumeroVenta(respuesta.numeroVenta ?? null);
      setToast({ type: "success", text: "Borrador guardado correctamente." });
      setError("");
    } catch (err) {
      setError(err.message || "Error al guardar el borrador.");
    } finally {
      setSaving(false);
    }
  };

  const confirmarVenta = async () => {
    const errores = validarFormulario();
    if (errores.length > 0) {
      setError(errores.join(". "));
      return;
    }

    setSaving(true);
    try {
      const payload = construirPayload();
      let idVenta = ventaId;

      if (idVenta) {
        const actualizada = await ventaService.actualizar(idVenta, payload);
        idVenta = actualizada._id;
      } else {
        const creada = await ventaService.crear(payload);
        idVenta = creada._id;
        setNumeroVenta(creada.numeroVenta ?? null);
      }

      await ventaService.confirmar(idVenta);
      setToast({ type: "success", text: "Venta confirmada correctamente." });
      limpiarFormulario();
    } catch (err) {
      setError(err.message || "Error al confirmar la venta.");
    } finally {
      setSaving(false);
    }
  };

  const cancelar = () => {
    limpiarFormulario();
    setToast({ type: "secondary", text: "La venta fue cancelada." });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Ventas</h3>
          <p className="text-muted small mb-0">
            Punto de venta con carrito, confirmación y control de stock.
          </p>
        </div>
        <div className="text-end">
          <div className="small text-muted">Atendido por</div>
          <div className="fw-semibold">
            {user?.nombre || user?.usuario || "Usuario autenticado"}
          </div>
          {numeroVenta != null && (
            <span className="badge bg-success-subtle text-success mt-2">
              Borrador #{numeroVenta}
            </span>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {toast && <div className={`alert alert-${toast.type}`}>{toast.text}</div>}

      <div className="row g-4 align-items-start">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Productos</h5>
                  <p className="text-muted small mb-0">
                    Busca productos disponibles y agrégalos al carrito.
                  </p>
                </div>
                <span className="badge bg-light text-dark">
                  {productos.length} resultado
                  {productos.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="input-group mb-3">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Buscar por código, nombre o marca..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loadingProductos ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th className="text-end">Precio</th>
                        <th className="text-end">Stock</th>
                        <th className="text-center" style={{ width: 110 }}>
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.length > 0 ? (
                        productos.map((producto) => (
                          <tr key={producto._id}>
                            <td className="fw-semibold">{producto.nombre}</td>
                            <td className="text-nowrap">{producto.codigo}</td>
                            <td className="text-end">
                              {formatPrice(producto.precioVenta)}
                            </td>
                            <td className="text-end">
                              <span
                                className={`badge ${
                                  Number(producto.stockActual) > 0
                                    ? "bg-success"
                                    : "bg-secondary"
                                }`}
                              >
                                {Number(producto.stockActual) > 0
                                  ? producto.stockActual
                                  : "Sin stock"}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => agregarProducto(producto)}
                                disabled={Number(producto.stockActual) <= 0}
                              >
                                <i className="bi bi-plus-lg me-1"></i>Agregar
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="text-center text-muted py-4"
                          >
                            No se encontraron productos para la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Datos de la venta</h5>

              <div className="mb-3">
                <label className="form-label small text-muted">Cliente</label>
                <select
                  className="form-select"
                  name="cliente"
                  value={form.cliente}
                  onChange={handleFormChange}
                  disabled={loadingClientes}
                >
                  <option value="">Consumidor Final</option>
                  {clientes.map((cliente) => (
                    <option key={cliente._id} value={cliente._id}>
                      {cliente.nombre} - {cliente.rut}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">
                  Método de pago
                </label>
                <select
                  className="form-select"
                  name="metodoPago"
                  value={form.metodoPago}
                  onChange={handleFormChange}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CAJA_VECINA">Caja Vecina</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">
                  Observaciones
                </label>
                <textarea
                  className="form-control"
                  name="observaciones"
                  rows="3"
                  placeholder="Notas internas de la venta"
                  value={form.observaciones}
                  onChange={handleFormChange}
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Descuento</label>
                <input
                  type="number"
                  className="form-control"
                  name="descuento"
                  min="0"
                  step="1"
                  value={form.descuento}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Carrito</h5>
                  <p className="text-muted small mb-0">
                    Ajusta cantidades y revisa el total antes de confirmar.
                  </p>
                </div>
                <span className="badge bg-success-subtle text-success">
                  {cart.length} ítems
                </span>
              </div>

              <div className="table-responsive mb-3">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Producto</th>
                      <th className="text-center">Cant.</th>
                      <th className="text-end">P. Unit.</th>
                      <th className="text-end">Subtotal</th>
                      <th className="text-center" style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length > 0 ? (
                      cart.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <div className="fw-semibold">{item.nombre}</div>
                            <div className="text-muted small">
                              Stock: {item.stockActual}
                            </div>
                          </td>
                          <td className="text-center" style={{ width: 90 }}>
                            <input
                              type="number"
                              className="form-control form-control-sm text-center"
                              min="1"
                              max={item.stockActual}
                              value={item.cantidad}
                              onChange={(e) =>
                                cambiarCantidad(item._id, e.target.value)
                              }
                            />
                          </td>
                          <td className="text-end text-nowrap">
                            {formatPrice(item.precioUnitario)}
                          </td>
                          <td className="text-end text-nowrap">
                            {formatPrice(item.subtotal)}
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => eliminarProducto(item._id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">
                          El carrito está vacío.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-top pt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Descuento</span>
                  <strong>- {formatPrice(descuento)}</strong>
                </div>
                <div className="d-flex justify-content-between fs-5">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold text-success">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <div className="d-grid gap-2 mt-4">
                <button
                  className="btn btn-outline-success"
                  onClick={guardarBorrador}
                  disabled={saving}
                >
                  <i className="bi bi-save me-1"></i>Guardar borrador
                </button>
                <button
                  className="btn btn-success"
                  onClick={confirmarVenta}
                  disabled={saving}
                >
                  <i className="bi bi-check2-circle me-1"></i>Confirmar venta
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={cancelar}
                >
                  <i className="bi bi-x-lg me-1"></i>Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Ventas;
