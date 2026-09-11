import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import productService from "../../services/productService";
import clientService from "../../services/clientService";
import ventaService from "../../services/ventaService";
import TicketVenta from "../../components/Ventas/TicketVenta";
import { playSuccessBeep, playWarningBeep, playSaleDoneBeep } from "../../utils/audioBeep";
import { formatRut, validarRut } from "../../utils/validators";

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
  const [productosRapidos, setProductosRapidos] = useState([]);
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
  const [showProductos, setShowProductos] = useState(false);
  const scannerRef = useRef(null);

  const focusScanner = useCallback(() => {
    scannerRef.current?.focus();
  }, []);

  const formatPrice = useCallback((value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  }, []);

  const cargarProductos = useCallback(async (term = "") => {
    try {
      const data = await productService.listar({
        search: term,
        limit: 20,
        activo: "true",
      });
      setProductos(data.productos || []);
      if (!term) {
        setProductosRapidos((prev) => (!prev || prev.length === 0 ? (data.productos || []) : prev));
      }
    } catch {
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const cargarClientes = useCallback(async () => {
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

  useEffect(() => {
    focusScanner();
  }, [focusScanner]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        setForm((prev) => ({ ...prev, metodoPago: "EFECTIVO" }));
      } else if (e.key === "F2") {
        e.preventDefault();
        setForm((prev) => ({ ...prev, metodoPago: "DEBITO" }));
      } else if (e.key === "F3") {
        e.preventDefault();
        setForm((prev) => ({ ...prev, metodoPago: METODO_FIADO }));
      } else if (e.key === "F4") {
        e.preventDefault();
        setForm((prev) => ({ ...prev, metodoPago: "TRANSFERENCIA" }));
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (showCobro) {
          setShowCobro(false);
        } else if (showNuevoCliente) {
          setShowNuevoCliente(false);
        } else if (ventaConfirmada) {
          setVentaConfirmada(null);
        } else {
          focusScanner();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showCobro, showNuevoCliente, ventaConfirmada, focusScanner]);

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
    () => clientes.find((cliente) => String(cliente._id || cliente.id) === String(form.cliente)) || null,
    [clientes, form.cliente],
  );

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const agregarProducto = (producto, onMensaje) => {
    const mostrarMensaje = onMensaje || ((mensaje) => setError(mensaje));
    const esActivo = producto?.activo !== false && producto?.activo !== 0;
    const stockDisponible = Number(producto?.stockActual ?? 0);

    if (!esActivo) {
      playWarningBeep();
      mostrarMensaje(`El producto "${producto?.nombre || 'seleccionado'}" se encuentra inactivo. Actívalo en el catálogo de productos.`);
      return "inactivo";
    }

    if (stockDisponible <= 0) {
      playWarningBeep();
      mostrarMensaje(`El producto "${producto?.nombre || 'seleccionado'}" no tiene stock disponible (Stock: 0).`);
      return "sin_stock";
    }

    const existente = cart.find((item) => item._id === producto._id);

    if (existente && Number(existente.cantidad) >= stockDisponible) {
      playWarningBeep();
      mostrarMensaje(
        `Stock máximo alcanzado para ${producto.nombre}: solo hay ${stockDisponible} disponible(s).`,
      );
      return "max_stock";
    }

    playSuccessBeep();
    setCart((prev) => {
      const itemExistente = prev.find((item) => item._id === producto._id);
      if (!itemExistente) {
        return [
          ...prev,
          {
            _id: producto._id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            stockActual: stockDisponible,
            precioUnitario: Number(producto.precioVenta || 0),
            cantidad: 1,
            descuento: 0,
            subtotal: Number(producto.precioVenta || 0),
          },
        ];
      }

      return prev.map((item) => {
        if (item._id !== producto._id) return item;
        const cantidad = Math.min(
          Number(item.cantidad) + 1,
          stockDisponible || 1,
        );
        return {
          ...item,
          cantidad,
          subtotal: cantidad * Number(item.precioUnitario || 0),
        };
      });
    });

    setError("");
    return "agregado";
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

  const buscarScanner = async (codigoCrudo) => {
    const codigo = String(codigoCrudo || "")
      .split("")
      .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
      .join("")
      .trim();
    if (!codigo) {
      setScanner("");
      focusScanner();
      return;
    }

    try {
      // 1. Búsqueda exacta directa por código o código de barras
      let encontrado = await productService.buscarPorCodigo(codigo);

      // 2. Si no se encuentra directo, buscar en lista de productos
      if (!encontrado) {
        const data = await productService.listar({
          search: codigo,
          limit: 10,
          activo: "true",
        });
        encontrado = (data.productos || []).find(
          (producto) =>
            producto.codigoBarras === codigo ||
            producto.codigo === codigo ||
            String(producto.codigoBarras || "").trim().toLowerCase() === codigo.toLowerCase() ||
            String(producto.codigo || "").trim().toLowerCase() === codigo.toLowerCase(),
        );
      }

      if (!encontrado) {
        playWarningBeep();
        setToast({ type: "danger", text: `Producto no encontrado: ${codigo}` });
        setError("");
        setScanner("");
        focusScanner();
        return;
      }

      agregarProducto(encontrado, (mensaje) =>
        setToast({ type: "warning", text: mensaje }),
      );
      setError("");
    } catch {
      playWarningBeep();
      setToast({
        type: "danger",
        text: "Error al buscar el código de barras.",
      });
    } finally {
      setScanner("");
      focusScanner();
    }
  };

  const buscarScannerRef = useRef(null);

  useEffect(() => {
    buscarScannerRef.current = buscarScanner;
  });

  useEffect(() => {
    let buffer = "";
    let ultimaTecla = 0;
    let timeoutId = null;

    const handler = (e) => {
      // Hotkeys globales de POS
      if (e.key === "F1") {
        e.preventDefault();
        if (cart.length > 0) {
          setForm((prev) => ({ ...prev, metodoPago: "EFECTIVO" }));
          setShowCobro(true);
        }
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) {
          setForm((prev) => ({ ...prev, metodoPago: "DEBITO" }));
          setShowCobro(true);
        }
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        if (cart.length > 0) {
          setForm((prev) => ({ ...prev, metodoPago: "FIADO" }));
          setShowCobro(true);
        }
        return;
      }
      if (e.key === "Escape") {
        if (showCobro) {
          setShowCobro(false);
          focusScanner();
        } else if (showNuevoCliente) {
          setShowNuevoCliente(false);
          focusScanner();
        } else if (ticketToPrint) {
          setTicketToPrint(null);
          focusScanner();
        } else if (cart.length > 0) {
          cancelar();
        }
        return;
      }

      if (showCobro || showNuevoCliente || ticketToPrint || saving) return;

      const target = e.target;
      const esCampoEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (esCampoEditable) return;

      if (e.key === "Enter") {
        if (buffer.length > 0) {
          e.preventDefault();
          const codigo = buffer;
          buffer = "";
          void buscarScannerRef.current?.(codigo);
        }
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      const ahora = Date.now();
      if (ahora - ultimaTecla > 100) buffer = "";
      buffer += e.key;
      ultimaTecla = ahora;

      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        buffer = "";
        ultimaTecla = 0;
      }, 300);
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [showCobro, showNuevoCliente, ticketToPrint, saving, cart.length, focusScanner]);

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
        idVenta = actualizada._id || actualizada.id;
        numeroVentaConfirmada = actualizada.numeroVenta ?? numeroVenta;
      } else {
        const creada = await ventaService.crear(payload);
        idVenta = creada._id || creada.id || creada.venta?._id || creada.venta?.id;
        numeroVentaConfirmada = creada.numeroVenta ?? creada.venta?.numeroVenta ?? null;
        setNumeroVenta(numeroVentaConfirmada);
      }

      playSaleDoneBeep();
      setShowCobro(false);
      const ticketConfirmada = construirTicketConfirmada(numeroVentaConfirmada);
      limpiarFormulario();
      setVentaConfirmada(ticketConfirmada);
      focusScanner();
    } catch (err) {
      playWarningBeep();
      console.error("[Ventas] Error al confirmar cobro:", err);
      setError(err.message || "Error al confirmar la venta.");
    } finally {
      setSaving(false);
    }
  };

  const fijarMontoRecibido = (valor) => setMontoRecibido(String(valor));

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
    const finalVal = name === "rut" ? formatRut(value) : value;
    setNuevoCliente((prev) => ({ ...prev, [name]: finalVal }));
    setError("");
  };

  const guardarNuevoCliente = async (e) => {
    e.preventDefault();
    setError("");

    if (!nuevoCliente.nombre.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }

    if (nuevoCliente.rut.trim() && !validarRut(nuevoCliente.rut)) {
      setError("El RUT ingresado no es válido (ej: 12.345.678-5).");
      return;
    }

    setGuardandoCliente(true);
    try {
      const res = await clientService.crear({
        nombre: nuevoCliente.nombre.trim(),
        rut: nuevoCliente.rut.trim(),
        telefono: nuevoCliente.telefono.trim(),
        activo: true,
      });

      const clienteNuevo = res.cliente || res;
      setClientes((prev) => [clienteNuevo, ...prev]);
      setForm((prev) => ({ ...prev, cliente: String(clienteNuevo._id || clienteNuevo.id) }));
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
    clienteId: form.cliente ? Number(form.cliente) : null,
    clienteNombre: clienteSeleccionado?.nombre || null,
    cajeroId: user?.id || 1,
    cajeroNombre: user?.nombre || "Cajero",
    metodoPago: form.metodoPago,
    metodoPagoPrincipal: (form.metodoPago || "efectivo").toLowerCase(),
    observaciones: form.observaciones,
    descuento: Number(form.descuento || 0),
    montoRecibido: form.metodoPago === "EFECTIVO" ? recibido : total,
    vuelto: form.metodoPago === "EFECTIVO" ? (recibido - total) : 0,
    total,
    subtotal,
    productos: cart.map((item) => ({
      producto: item._id || item.id,
      productoId: item._id || item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      precioUnitario: Number(item.precioUnitario),
      cantidad: Number(item.cantidad),
      descuento: Number(item.descuento || 0),
      subtotal: Number(item.subtotal),
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
    <div className="pos-page px-1 py-1">
      {/* 1. BARRA SUPERIOR COMPACTA */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
        <div className="d-flex align-items-center gap-2">
          <h4 className="fw-bold mb-0 text-success d-flex align-items-center gap-1" style={{ fontSize: "1.1rem" }}>
            <i className="bi bi-cart-check"></i> Ventas
          </h4>
          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style={{ fontSize: "0.68rem" }}>
            v22 POS
          </span>
        </div>

        {/* Atajos de teclado - Solo visibles en PC */}
        <div className="d-none d-md-flex align-items-center gap-1">
          <span className="badge bg-light text-dark border px-2 py-1 small">
            <kbd className="bg-success text-white me-1">F1</kbd> Efectivo
          </span>
          <span className="badge bg-light text-dark border px-2 py-1 small">
            <kbd className="bg-primary text-white me-1">F2</kbd> Débito
          </span>
          <span className="badge bg-light text-dark border px-2 py-1 small">
            <kbd className="bg-info text-dark me-1">F4</kbd> Transf.
          </span>
          <span className="badge bg-light text-dark border px-2 py-1 small">
            <kbd className="bg-danger text-white me-1">F3</kbd> Fiado
          </span>
          <span className="badge bg-light text-dark border px-2 py-1 small">
            <kbd className="bg-secondary text-white me-1">ESC</kbd> Cancelar
          </span>
        </div>

        <div className="d-flex align-items-center gap-2 text-end">
          <div className="small text-truncate" style={{ maxWidth: "120px" }}>
            <span className="text-muted">Cajero: </span>
            <strong className="text-dark">{user?.nombre || user?.usuario || "Yasna"}</strong>
          </div>
          {numeroVenta != null && (
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning border-opacity-50" style={{ fontSize: "0.68rem" }}>
              #{numeroVenta}
            </span>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger py-1 px-3 mb-2 small">{error}</div>}
      {toast && <div className={`alert alert-${toast.type} py-1 px-3 mb-2 small`}>{toast.text}</div>}

      {ventaConfirmada && (
        <div className="alert alert-success d-flex justify-content-between align-items-center py-2 px-3 mb-2 small flex-wrap gap-2">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            Venta {ventaConfirmada.venta.numeroVenta != null && `#${ventaConfirmada.venta.numeroVenta} `}
            confirmada por <strong>{formatPrice(ventaConfirmada.venta.total)}</strong>.
          </div>
          <div className="d-flex gap-2 ms-auto">
            <button
              type="button"
              className="btn btn-success btn-sm py-0 px-2"
              onClick={() => setTicketToPrint(ventaConfirmada)}
            >
              <i className="bi bi-printer me-1"></i>Ticket
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm py-0 px-2"
              onClick={() => setVentaConfirmada(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* 2. BARRA DE ENTRADA RÁPIDA: Escáner de Barras + Búsqueda Rápida + Granel */}
      <div className="card border-0 shadow-sm mb-2 bg-light">
        <div className="card-body p-2">
          <div className="row g-2 align-items-center">
            {/* Input Escáner de Barras */}
            <div className="col-12 col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white text-success fw-bold py-1">
                  <i className="bi bi-upc-scan me-1"></i> <span className="d-none d-sm-inline">Escanear:</span>
                </span>
                <input
                  id="scanner-input"
                  className="form-control fw-semibold"
                  placeholder="Escanea o escribe código..."
                  value={scanner}
                  ref={scannerRef}
                  onChange={(e) => setScanner(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      void buscarScanner(e.target.value);
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Input Búsqueda Rápida de Texto */}
            <div className="col-12 col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white text-muted py-1">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  id="busqueda-rapida-input"
                  className="form-control"
                  placeholder="Buscar por nombre, categoría..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Acceso Rápido / Granel (1 Toque) con scroll horizontal suave en móvil */}
            {productosRapidos && productosRapidos.length > 0 && (
              <div className="col-12 pt-1">
                <div className="d-flex align-items-center gap-1 flex-nowrap overflow-auto py-1" style={{ WebkitOverflowScrolling: "touch" }}>
                  <span className="badge bg-warning bg-opacity-25 text-dark me-1 py-1 small flex-shrink-0" style={{ fontSize: "0.72rem" }}>
                    <i className="bi bi-lightning-fill text-warning me-1"></i>Rápido:
                  </span>
                  {productosRapidos.slice(0, 10).map((prod) => (
                    <button
                      key={prod._id || prod.id}
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1 flex-shrink-0"
                      style={{ fontSize: "0.75rem" }}
                      disabled={Number(prod.stockActual) <= 0}
                      onClick={() => {
                        agregarProducto(prod);
                        focusScanner();
                      }}
                      title={`${prod.nombre} - ${formatPrice(prod.precioVenta)} (Stock: ${prod.stockActual})`}
                    >
                      {(prod.imagen || prod.imagenUrl) && (
                        <img
                          src={prod.imagen || prod.imagenUrl}
                          alt=""
                          className="rounded-circle"
                          style={{ width: "16px", height: "16px", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      <span className="fw-semibold text-truncate" style={{ maxWidth: "100px" }}>
                        {prod.nombre}
                      </span>
                      <strong className="text-success">{formatPrice(prod.precioVenta)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lista flotante de resultados de búsqueda rápida */}
          {search.trim() !== "" && (
            <div className="mt-2 border rounded bg-white shadow-sm overflow-auto" style={{ maxHeight: "180px" }}>
              {loadingProductos ? (
                <div className="text-center py-2">
                  <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {productos.length > 0 ? (
                    productos.map((producto) => (
                      <div
                        key={producto._id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-1 px-2"
                      >
                        <div className="d-flex align-items-center gap-2 min-w-0 flex-grow-1">
                          {(producto.imagen || producto.imagenUrl) ? (
                            <img
                              src={producto.imagen || producto.imagenUrl}
                              alt=""
                              className="rounded border shadow-xs flex-shrink-0"
                              style={{ width: "36px", height: "36px", objectFit: "cover" }}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className="rounded bg-light d-flex align-items-center justify-content-center text-muted flex-shrink-0"
                              style={{ width: "36px", height: "36px", fontSize: "0.8rem" }}
                            >
                              <i className="bi bi-box"></i>
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="fw-semibold small text-dark d-block text-truncate">{producto.nombre}</span>
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-muted small">[Cód: {producto.codigo}]</span>
                              <span className="text-success fw-bold small">{formatPrice(producto.precioVenta)}</span>
                              <span className={`badge ${Number(producto.stockActual) > 0 ? "bg-success" : "bg-secondary"}`} style={{ fontSize: "0.68rem" }}>
                                Stock: {producto.stockActual}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-success py-1 px-2 flex-shrink-0"
                          onClick={() => {
                            agregarProducto(producto);
                            setSearch("");
                            focusScanner();
                          }}
                          disabled={Number(producto.stockActual) <= 0}
                        >
                          <i className="bi bi-plus-lg me-1"></i>Agregar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted py-2 small">
                      No se encontraron productos coincidentes.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. ESPACIO PRINCIPAL POS EN 2 COLUMNAS (Carrito a la Izquierda, Cobro a la Derecha) */}
      <div className="row g-2 align-items-start">
        {/* COLUMNA IZQUIERDA: CARRITO DE LA VENTA */}
        <div className="col-lg-7 col-xl-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center border-bottom">
              <span className="fw-bold small text-dark">
                <i className="bi bi-cart-check text-success me-1"></i>
                Carrito ({cart.length} producto{cart.length === 1 ? "" : "s"})
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm py-0 px-2"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => setCart([])}
                  title="Vaciar carrito"
                >
                  <i className="bi bi-trash me-1"></i>Vaciar
                </button>
              )}
            </div>

            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: "350px", minHeight: "180px", overflowY: "auto" }}>
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: "42%" }}>Producto</th>
                      <th className="text-center" style={{ width: "24%" }}>Cantidad</th>
                      <th className="text-end" style={{ width: "16%" }}>P. Unit</th>
                      <th className="text-end" style={{ width: "18%" }}>Subtotal</th>
                      <th style={{ width: "35px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length > 0 ? (
                      cart.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {(item.imagen || item.imagenUrl) ? (
                                <img
                                  src={item.imagen || item.imagenUrl}
                                  alt=""
                                  className="rounded border flex-shrink-0"
                                  style={{ width: "32px", height: "32px", objectFit: "cover" }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : null}
                              <div className="min-w-0">
                                <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: "200px" }}>
                                  {item.nombre}
                                </div>
                                <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                                  Stock: {item.stockActual}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="input-group input-group-sm justify-content-center" style={{ maxWidth: "115px", margin: "0 auto" }}>
                              <button
                                type="button"
                                className="btn btn-outline-secondary py-0 px-2"
                                disabled={Number(item.cantidad) <= 1}
                                onClick={() => cambiarCantidad(item._id, Number(item.cantidad) - 1)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="form-control text-center p-0 fw-bold"
                                min="1"
                                max={item.stockActual}
                                value={item.cantidad}
                                onChange={(e) => cambiarCantidad(item._id, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-outline-secondary py-0 px-2"
                                disabled={Number(item.cantidad) >= Number(item.stockActual)}
                                onClick={() => cambiarCantidad(item._id, Number(item.cantidad) + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-end text-nowrap text-muted">
                            {formatPrice(item.precioUnitario)}
                          </td>
                          <td className="text-end text-nowrap fw-bold text-success">
                            {formatPrice(item.subtotal)}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-0 px-1 border-0"
                              onClick={() => eliminarProducto(item._id)}
                              title="Quitar"
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-5">
                          <i className="bi bi-cart-x fs-3 d-block mb-1 text-muted"></i>
                          El carrito está vacío. Escanea o busca un producto arriba.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL DE COBRO Y DATOS DE LA VENTA */}
        <div className="col-lg-5 col-xl-4">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body p-3">
              {/* Cliente */}
              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold mb-0">Cliente</label>
                  <button
                    type="button"
                    className="btn btn-link text-success p-0 small text-decoration-none fw-semibold"
                    onClick={() => setShowNuevoCliente(true)}
                  >
                    + Nuevo Cliente
                  </button>
                </div>
                <select
                  className="form-select form-select-sm"
                  name="cliente"
                  value={form.cliente}
                  onChange={handleFormChange}
                  disabled={loadingClientes}
                >
                  <option value="">Consumidor Final</option>
                  {clientes.map((cliente) => (
                    <option key={cliente._id} value={cliente._id}>
                      {cliente.nombre} {cliente.rut ? `(${cliente.rut})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Método de Pago con Botones Rápidos Táctiles */}
              <div className="mb-2">
                <label className="form-label small fw-bold mb-1">Método de Pago</label>
                <div className="row g-1 row-cols-2 row-cols-md-4">
                  <div className="col">
                    <button
                      type="button"
                      className={`btn btn-sm w-100 fw-semibold py-2 py-md-1 ${form.metodoPago === "EFECTIVO" ? "btn-success shadow-sm" : "btn-outline-secondary"}`}
                      onClick={() => setForm((prev) => ({ ...prev, metodoPago: "EFECTIVO" }))}
                    >
                      <i className="bi bi-cash me-1"></i>Efectivo
                    </button>
                  </div>
                  <div className="col">
                    <button
                      type="button"
                      className={`btn btn-sm w-100 fw-semibold py-2 py-md-1 ${form.metodoPago === "DEBITO" ? "btn-primary shadow-sm" : "btn-outline-secondary"}`}
                      onClick={() => setForm((prev) => ({ ...prev, metodoPago: "DEBITO" }))}
                    >
                      <i className="bi bi-credit-card me-1"></i>Débito
                    </button>
                  </div>
                  <div className="col">
                    <button
                      type="button"
                      className={`btn btn-sm w-100 fw-semibold py-2 py-md-1 ${form.metodoPago === "TRANSFERENCIA" ? "btn-info text-white shadow-sm" : "btn-outline-secondary"}`}
                      onClick={() => setForm((prev) => ({ ...prev, metodoPago: "TRANSFERENCIA" }))}
                    >
                      <i className="bi bi-bank me-1"></i>Transf.
                    </button>
                  </div>
                  <div className="col">
                    <button
                      type="button"
                      className={`btn btn-sm w-100 fw-semibold py-2 py-md-1 ${form.metodoPago === METODO_FIADO ? "btn-danger shadow-sm" : "btn-outline-secondary"}`}
                      onClick={() => setForm((prev) => ({ ...prev, metodoPago: METODO_FIADO }))}
                    >
                      <i className="bi bi-person-fill-exclamation me-1"></i>Fiado
                    </button>
                  </div>
                </div>
              </div>

              {/* Alerta si es Fiado */}
              {esFiado && (
                <div className="alert alert-warning py-1 px-2 small mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Deuda actual:</span>
                    <strong>{formatoMoneda(saldoCliente?.saldoPendiente || 0)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Crédito disponible:</span>
                    <strong>{formatoMoneda(saldoCliente?.disponible || 0)}</strong>
                  </div>
                </div>
              )}

              {/* Descuento Inline */}
              <div className="d-flex align-items-center justify-content-between mb-2">
                <label className="form-label small text-muted mb-0">Descuento ($):</label>
                <input
                  type="number"
                  className="form-control form-control-sm text-end"
                  style={{ width: "110px" }}
                  name="descuento"
                  min="0"
                  step="100"
                  value={form.descuento}
                  onChange={handleFormChange}
                />
              </div>

              {/* BANNER DE TOTAL GIGANTE */}
              <div className="bg-success text-white rounded p-3 text-center mb-2 shadow-sm">
                <span className="small text-white-50 d-block">TOTAL A COBRAR</span>
                <div className="fs-1 fw-bold line-height-1">
                  {formatPrice(total)}
                </div>
                {descuento > 0 && (
                  <span className="badge bg-light text-dark mt-1">
                    Ahorro: -{formatPrice(descuento)}
                  </span>
                )}
              </div>

              {/* BOTÓN PRINCIPAL DE COBRO */}
              <div className="d-grid gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-success btn-lg fw-bold shadow-sm py-3 py-md-2"
                  onClick={abrirCobro}
                  disabled={saving || cart.length === 0}
                >
                  <i className="bi bi-cash-coin me-2"></i>
                  Cobrar {formatPrice(total)} <span className="d-none d-md-inline">(F1)</span>
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm flex-grow-1"
                    onClick={guardarBorrador}
                    disabled={saving || cart.length === 0}
                  >
                    <i className="bi bi-save me-1"></i>Borrador
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={cancelar}
                  >
                    <i className="bi bi-x-lg me-1"></i>Cancelar (ESC)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-4">
        <button
          type="button"
          className="btn btn-light d-flex justify-content-between align-items-center w-100 px-4 py-3 border-0"
          onClick={() => setShowProductos((prev) => !prev)}
          aria-expanded={showProductos}
        >
          <span className="fw-bold">
            <i className="bi bi-box-seam text-success me-2"></i>Productos
            <span className="badge bg-light text-dark ms-2">
              {productos.length}
            </span>
          </span>
          <span className="fw-semibold text-success">
            <i
              className={`bi bi-chevron-${
                showProductos ? "up" : "down"
              } me-1`}
            ></i>
            {showProductos ? "Ocultar catálogo" : "Ver catálogo"}
          </span>
        </button>
        {showProductos && (
          <div className="card-body border-top pt-3">
            <p className="text-muted small mb-3">
              Busca productos disponibles y agrégalos al carrito.
            </p>

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
                <div
                  className="spinner-border text-success"
                  role="status"
                >
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive d-none d-md-block pos-productos-lista">
                  <table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th className="text-end">Precio</th>
                        <th className="text-end">Stock</th>
                        <th className="text-center" style={{ width: 120 }}>
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
                                disabled={
                                  Number(producto.stockActual) <= 0
                                }
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

                <div className="d-md-none pos-productos-lista">
                  <div className="list-group">
                    {productos.length > 0 ? (
                      productos.map((producto) => (
                        <div
                          key={producto._id}
                          className="list-group-item d-flex justify-content-between align-items-center gap-3 py-3"
                        >
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-semibold">{producto.nombre}</div>
                            <div className="text-muted small text-truncate">
                              Código: {producto.codigo}
                            </div>
                            <div className="d-flex align-items-center gap-3 mt-1">
                              <span className="text-success fw-semibold">
                                {formatPrice(producto.precioVenta)}
                              </span>
                              <span
                                className={`badge ${
                                  Number(producto.stockActual) > 0
                                    ? "bg-success"
                                    : "bg-secondary"
                                }`}
                              >
                                {Number(producto.stockActual) > 0
                                  ? `Stock: ${producto.stockActual}`
                                  : "Sin stock"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-success text-nowrap"
                            onClick={() => {
                              agregarProducto(producto);
                              focusScanner();
                            }}
                            disabled={Number(producto.stockActual) <= 0}
                          >
                            <i className="bi bi-plus-lg me-1"></i>Agregar
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted py-4">
                        No se encontraron productos para la búsqueda.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="d-lg-none position-fixed start-0 end-0 bottom-0 p-3 bg-white border-top shadow pos-sticky-footer">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-semibold text-muted">Total</span>
          <span className="fs-4 fw-bold text-success">{formatPrice(total)}</span>
        </div>
        <button
          type="button"
          className="btn btn-success w-100"
          onClick={abrirCobro}
          disabled={saving}
        >
          <i className="bi bi-cash-coin me-1"></i>
          Cobrar {formatPrice(total)}
        </button>
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
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
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
                        className="btn btn-outline-secondary"
                        onClick={() => fijarMontoRecibido(total)}
                      >
                        Exacto
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fijarMontoRecibido(1000)}
                      >
                        $1.000
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fijarMontoRecibido(2000)}
                      >
                        $2.000
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fijarMontoRecibido(5000)}
                      >
                        $5.000
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fijarMontoRecibido(10000)}
                      >
                        $10.000
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => fijarMontoRecibido(20000)}
                      >
                        $20.000
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
                      <div className="text-danger small fw-semibold mt-1">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Monto insuficiente
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
