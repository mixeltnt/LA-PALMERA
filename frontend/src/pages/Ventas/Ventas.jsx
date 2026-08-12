import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import productService from "../../services/productService";
import clientService from "../../services/clientService";
import ventaService from "../../services/ventaService";
import TicketVenta from "../../components/Ventas/TicketVenta";

const emptyForm = {
  cliente: "",
  metodoPago: "EFECTIVO",
  observaciones: "",
  descuento: "0",
};

const METODO_FIADO = "FIADO";

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
  const [saldoCliente, setSaldoCliente] = useState(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [scanner, setScanner] = useState("");
  const [showCobro, setShowCobro] = useState(false);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    rut: "",
    telefono: "",
  });
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [ventaConfirmada, setVentaConfirmada] = useState(null);
  const [ticketToPrint, setTicketToPrint] = useState(null);
  const scannerRef = useRef(null);

  const focusScanner = useCallback(() => {
    scannerRef.current?.focus();
  }, []);

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

  const esFiado = form.metodoPago === METODO_FIADO;

  useEffect(() => {
    if (!esFiado || !form.cliente) {
      setSaldoCliente(null);
      return;
    }

    let activo = true;
    setLoadingSaldo(true);
    clientService
      .obtenerSaldo(form.cliente)
      .then((data) => {
        if (activo) setSaldoCliente(data);
      })
      .catch(() => {
        if (activo) setSaldoCliente(null);
      })
      .finally(() => {
        if (activo) setLoadingSaldo(false);
      });

    return () => {
      activo = false;
    };
  }, [esFiado, form.cliente]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente._id === form.cliente) || null,
    [clientes, form.cliente],
  );

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
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

      return prev.map((item) => {
        if (item._id !== producto._id) return item;
        const cantidad = Math.min(
          Number(item.cantidad) + 1,
          Number(item.stockActual) || 1,
        );
        return {
          ...item,
          cantidad,
          subtotal: cantidad * Number(item.precioUnitario || 0),
        };
      });
    });
    if (!blocked) {
      setError("");
    }
  };

  const cambiarCantidad = (id, value) => {
    const solicitada = Number(value);
    setCart((prev) =>
      prev.map((item) => {
        if (item._id !== id) return item;
        const disponible = Number(item.stockActual) || 1;
        const cantidad = Math.min(
          Math.max(Number.isFinite(solicitada) ? solicitada : 1, 1),
          disponible,
        );
        if (Number.isFinite(solicitada) && solicitada > disponible) {
          setError(`Solo hay ${disponible} en stock para ${item.nombre}.`);
        } else if (error) {
          setError("");
        }
        return {
          ...item,
          cantidad,
          subtotal: cantidad * Number(item.precioUnitario || 0),
        };
      }),
    );
  };

  const eliminarProducto = (id) => {
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  const escapeRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const buscarScanner = async () => {
    const codigo = scanner.trim();
    if (!codigo) return;

    try {
      const data = await productService.listar({
        search: `^${escapeRegex(codigo)}$`,
        limit: 10,
        activo: "true",
      });
      const encontrado = (data.productos || []).find(
        (producto) =>
          producto.codigoBarras === codigo || producto.codigo === codigo,
      );

      if (!encontrado) {
        setError(`No se encontró el producto con código "${codigo}".`);
        setScanner("");
        focusScanner();
        return;
      }

      agregarProducto(encontrado);
      setError("");
      setScanner("");
    } catch {
      setError("Error al buscar el código de barras.");
      setScanner("");
    } finally {
      focusScanner();
    }
  };

  const abrirCobro = () => {
    const errores = validarFormulario();
    if (errores.length > 0) {
      setError(errores.join(". "));
      return;
    }

    setVentaConfirmada(null);
    setMontoRecibido("");
    setShowCobro(true);
  };

  const construirTicketConfirmada = (numeroVentaConfirmada) => {
    const venta = {
      numeroVenta: numeroVentaConfirmada ?? numeroVenta ?? null,
      fecha: new Date().toISOString(),
      subtotal,
      descuento,
      total,
      estado: "CONFIRMADA",
      metodoPago: form.metodoPago,
      observaciones: form.observaciones,
      cliente: clienteSeleccionado
        ? {
            nombre: clienteSeleccionado.nombre,
            rut: clienteSeleccionado.rut,
          }
        : null,
      usuario: user ? { nombre: user.nombre, usuario: user.usuario } : null,
    };
    const detalles = cart.map((item) => ({
      producto: item._id
        ? { codigo: item.codigo, nombre: item.nombre }
        : null,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento || 0,
      subtotal: item.subtotal,
    }));
    return {
      venta,
      detalles,
      montoRecibido: form.metodoPago === "EFECTIVO" ? recibido : null,
      saldoCliente: esFiado ? saldoCliente : null,
    };
  };

  const ejecutarConfirmacion = async () => {
    setSaving(true);
    try {
      const payload = construirPayload();
      let idVenta = ventaId;
      let numeroVentaConfirmada = numeroVenta;

      if (idVenta) {
        const actualizada = await ventaService.actualizar(idVenta, payload);
        idVenta = actualizada._id;
        numeroVentaConfirmada = actualizada.numeroVenta ?? numeroVenta;
      } else {
        const creada = await ventaService.crear(payload);
        idVenta = creada._id;
        numeroVentaConfirmada = creada.numeroVenta ?? null;
        setNumeroVenta(creada.numeroVenta ?? null);
      }

      await ventaService.confirmar(idVenta);
      setShowCobro(false);
      setToast({ type: "success", text: "Venta confirmada correctamente." });
      const ticketConfirmada = construirTicketConfirmada(numeroVentaConfirmada);
      limpiarFormulario();
      setVentaConfirmada(ticketConfirmada);
      focusScanner();
    } catch (err) {
      setError(err.message || "Error al confirmar la venta.");
    } finally {
      setSaving(false);
    }
  };

  const fijarMontoRecibido = (valor) => setMontoRecibido(String(valor));

  const sumarMontoRecibido = (valor) =>
    setMontoRecibido((prev) =>
      String((Number(prev) || 0) + valor),
    );

  const recibido = Number(montoRecibido) || 0;
  const vuelto = recibido - total;
  const cobroEfectivoValido =
    montoRecibido !== "" && recibido >= total;

  const handleMontoRecibidoKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (cobroEfectivoValido && !saving) {
        void ejecutarConfirmacion();
      }
    }
  };

  const cerrarCobro = () => {
    if (saving) return;
    setShowCobro(false);
    focusScanner();
  };

  const cerrarNuevoCliente = () => {
    if (guardandoCliente) return;
    setShowNuevoCliente(false);
  };

  const handleNuevoClienteChange = (e) => {
    const { name, value } = e.target;
    setNuevoCliente((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const guardarNuevoCliente = async (e) => {
    e.preventDefault();
    setError("");

    if (!nuevoCliente.nombre.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardandoCliente(true);
    try {
      const creado = await clientService.crear({
        nombre: nuevoCliente.nombre.trim(),
        rut: nuevoCliente.rut.trim(),
        telefono: nuevoCliente.telefono.trim(),
        activo: true,
      });

      setClientes((prev) => [creado, ...prev]);
      setForm((prev) => ({ ...prev, cliente: creado._id }));
      setNuevoCliente({ nombre: "", rut: "", telefono: "" });
      setShowNuevoCliente(false);
      setToast({ type: "success", text: "Cliente creado y seleccionado." });
    } catch (err) {
      setError(err.message || "Error al crear el cliente.");
    } finally {
      setGuardandoCliente(false);
    }
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

    if (esFiado && !form.cliente) {
      errores.push(
        "Una venta fiada requiere seleccionar un cliente registrado.",
      );
    }

    if (esFiado && form.cliente && saldoCliente) {
      const limite = Number(saldoCliente.limiteFiado || 0);
      if (limite <= 0) {
        errores.push(
          "El cliente no tiene límite de fiado configurado. Configúralo al editar el cliente.",
        );
      } else if (total > Number(saldoCliente.disponible || 0)) {
        errores.push(
          `El total supera el crédito disponible del cliente (disponible: ${formatPrice(saldoCliente.disponible)}).`,
        );
      }
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

  const cancelar = () => {
    limpiarFormulario();
    setVentaConfirmada(null);
    setToast({ type: "secondary", text: "La venta fue cancelada." });
  };

  const formatoMoneda = useCallback((value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  }, []);

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

      {ventaConfirmada && (
        <div className="alert alert-success d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            Venta{" "}
            {ventaConfirmada.venta.numeroVenta != null &&
              `#${ventaConfirmada.venta.numeroVenta} `}
            confirmada por{" "}
            <strong>{formatPrice(ventaConfirmada.venta.total)}</strong>.
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => setTicketToPrint(ventaConfirmada)}
            >
              <i className="bi bi-printer me-1"></i>Imprimir ticket
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              title="Descartar ticket"
              onClick={() => setVentaConfirmada(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}

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

              <div className="input-group mb-3">
                <span className="input-group-text bg-white">
                  <i className="bi bi-upc-scan"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Código de barras (escanea y presiona Enter)..."
                  value={scanner}
                  ref={scannerRef}
                  onChange={(e) => setScanner(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void buscarScanner();
                    }
                  }}
                  autoFocus
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
                                onClick={() => {
                                  agregarProducto(producto);
                                  focusScanner();
                                }}
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
                <div className="input-group">
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
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    title="Nuevo cliente exprés"
                    onClick={() => setShowNuevoCliente(true)}
                  >
                    <i className="bi bi-person-plus"></i>
                  </button>
                </div>
                {esFiado && (
                  <div className="small text-muted mt-1">
                    La venta fiada requiere cliente obligatorio.
                  </div>
                )}
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
                  <option value="FIADO">FIADO</option>
                </select>
              </div>

              {esFiado && (
                <div className="alert alert-warning py-2 small">
                  <div className="fw-semibold mb-1">Venta fiada</div>
                  <div>
                    Cliente:{" "}
                    <strong>
                      {clienteSeleccionado?.nombre || "Seleccione un cliente"}
                    </strong>
                  </div>
                  {form.cliente ? (
                    loadingSaldo ? (
                      <div className="text-muted">Consultando saldo...</div>
                    ) : saldoCliente ? (
                      <>
                        <div className="d-flex justify-content-between">
                          <span>Deuda actual</span>
                          <strong>{formatoMoneda(saldoCliente.saldoPendiente)}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Esta venta</span>
                          <strong>{formatoMoneda(total)}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Nueva deuda</span>
                          <strong>
                            {formatoMoneda(
                              Number(saldoCliente.saldoPendiente || 0) + total,
                            )}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between border-top pt-1 mt-1">
                          <span>Límite de fiado</span>
                          <span>{formatoMoneda(saldoCliente.limiteFiado)}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Disponible</span>
                          <span
                            className={
                              total > Number(saldoCliente.disponible || 0)
                                ? "text-danger fw-semibold"
                                : ""
                            }
                          >
                            {formatoMoneda(saldoCliente.disponible)}
                          </span>
                        </div>
                        {Number(saldoCliente.limiteFiado || 0) <= 0 ? (
                          <div className="text-danger fw-semibold mt-1">
                            El cliente no tiene crédito disponible.
                          </div>
                        ) : total > Number(saldoCliente.disponible || 0) ? (
                          <div className="text-danger fw-semibold mt-1">
                            Esta venta supera el crédito disponible.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-danger">
                        No se pudo consultar el saldo del cliente.
                      </div>
                    )
                  ) : null}
                </div>
              )}

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
                          <td className="text-center" style={{ width: 150 }}>
                            <div className="input-group input-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                title="Disminuir cantidad"
                                disabled={Number(item.cantidad) <= 1}
                                onClick={() =>
                                  cambiarCantidad(
                                    item._id,
                                    Number(item.cantidad) - 1,
                                  )
                                }
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <input
                                type="number"
                                className="form-control text-center"
                                min="1"
                                max={item.stockActual}
                                value={item.cantidad}
                                onChange={(e) =>
                                  cambiarCantidad(item._id, e.target.value)
                                }
                              />
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                title="Aumentar cantidad"
                                disabled={
                                  Number(item.cantidad) >=
                                  Number(item.stockActual)
                                }
                                onClick={() =>
                                  cambiarCantidad(
                                    item._id,
                                    Number(item.cantidad) + 1,
                                  )
                                }
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>
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
                  className="btn btn-success btn-lg"
                  onClick={abrirCobro}
                  disabled={saving}
                >
                  <i className="bi bi-cash-coin me-1"></i>
                  Cobrar {formatPrice(total)}
                </button>
                <button
                  className="btn btn-outline-success"
                  onClick={guardarBorrador}
                  disabled={saving}
                >
                  <i className="bi bi-save me-1"></i>Guardar borrador
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

      {showCobro && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cerrarCobro();
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-cash-coin me-2"></i>Cobrar venta
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarCobro}
                  disabled={saving}
                ></button>
              </div>
              <div className="modal-body">
                {esFiado ? (
                  <div className="alert alert-warning py-2 small mb-3">
                    <div className="fw-semibold mb-1">
                      Venta fiada — {clienteSeleccionado?.nombre || ""}
                    </div>
                    {saldoCliente ? (
                      <>
                        <div className="d-flex justify-content-between">
                          <span>Deuda actual</span>
                          <strong>
                            {formatoMoneda(saldoCliente.saldoPendiente)}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Esta venta</span>
                          <strong>{formatoMoneda(total)}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Nueva deuda</span>
                          <strong>
                            {formatoMoneda(
                              Number(saldoCliente.saldoPendiente || 0) + total,
                            )}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between border-top pt-1 mt-1">
                          <span>Disponible</span>
                          <strong>{formatoMoneda(saldoCliente.disponible)}</strong>
                        </div>
                      </>
                    ) : (
                      <div className="text-danger">
                        No se pudo consultar el saldo del cliente.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center mb-3">
                    <div className="small text-muted">Total a cobrar</div>
                    <div className="display-5 fw-bold text-success">
                      {formatPrice(total)}
                    </div>
                  </div>
                )}

                {!esFiado && form.metodoPago === "EFECTIVO" && (
                  <>
                    <label className="form-label small fw-semibold">
                      Monto recibido
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-lg text-center mb-2"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      onKeyDown={handleMontoRecibidoKeyDown}
                      autoFocus
                    />
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => fijarMontoRecibido(total)}
                      >
                        Exacto
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => sumarMontoRecibido(5000)}
                      >
                        + $5.000
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => sumarMontoRecibido(10000)}
                      >
                        + $10.000
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => sumarMontoRecibido(20000)}
                      >
                        + $20.000
                      </button>
                    </div>
                    <div className="d-flex justify-content-between align-items-center border-top pt-3">
                      <span className="fw-semibold">Vuelto</span>
                      <span
                        className={`fs-3 fw-bold ${
                          recibido >= total ? "text-primary" : "text-muted"
                        }`}
                      >
                        {montoRecibido === "" || recibido < total
                          ? "—"
                          : formatPrice(vuelto)}
                      </span>
                    </div>
                    {montoRecibido !== "" && recibido < total && (
                      <div className="text-danger small mt-1">
                        El monto recibido es menor que el total.
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={cerrarCobro}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={ejecutarConfirmacion}
                  disabled={
                    saving ||
                    (form.metodoPago === "EFECTIVO" && !cobroEfectivoValido)
                  }
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                      ></span>
                      Confirmando...
                    </>
                  ) : (
                    "Confirmar cobro"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNuevoCliente && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cerrarNuevoCliente();
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus me-2"></i>Nuevo cliente exprés
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarNuevoCliente}
                  disabled={guardandoCliente}
                ></button>
              </div>
              <form onSubmit={guardarNuevoCliente} noValidate>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Nombre *
                    </label>
                    <input
                      className="form-control"
                      name="nombre"
                      value={nuevoCliente.nombre}
                      onChange={handleNuevoClienteChange}
                      required
                      placeholder="Nombre completo"
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">RUT</label>
                    <input
                      className="form-control"
                      name="rut"
                      value={nuevoCliente.rut}
                      onChange={handleNuevoClienteChange}
                      placeholder="12.345.678-9"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Teléfono
                    </label>
                    <input
                      className="form-control"
                      name="telefono"
                      value={nuevoCliente.telefono}
                      onChange={handleNuevoClienteChange}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={cerrarNuevoCliente}
                    disabled={guardandoCliente}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={guardandoCliente}
                  >
                    {guardandoCliente ? "Guardando..." : "Guardar y seleccionar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {ticketToPrint && (
        <TicketVenta
          venta={ticketToPrint.venta}
          detalles={ticketToPrint.detalles}
          montoRecibido={ticketToPrint.montoRecibido}
          saldoCliente={ticketToPrint.saldoCliente}
          onAfterPrint={() => {
            setTicketToPrint(null);
            focusScanner();
          }}
        />
      )}
    </div>
  );
}

export default Ventas;
