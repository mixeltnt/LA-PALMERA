import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AsistenteVirtual.css";

const CATEGORIAS = [
  { id: "todas", label: "Todos los Módulos", icono: "bi-grid-fill" },
  { id: "ventas", label: "Ventas & Caja", icono: "bi-cart-check-fill" },
  { id: "productos", label: "Productos & Stock", icono: "bi-box-seam-fill" },
  { id: "produccion", label: "Producción", icono: "bi-egg-fried" },
  { id: "fiados", label: "Clientes & Fiados", icono: "bi-people-fill" },
  { id: "compras", label: "Compras", icono: "bi-truck" },
  { id: "respaldos", label: "Respaldos & Seguridad", icono: "bi-shield-check" },
];

const GUIAS = [
  // --- VENTAS Y COBRO ---
  {
    id: "venta-rapida",
    categoria: "ventas",
    titulo: "🛒 ¿Cómo realizar una Venta y usar los Atajos Rápidos?",
    icono: "bi-cart-check-fill",
    resumen: "Atajos de teclado F1 a F4, escaneo con pistola, métodos de pago (Efectivo, Débito, Transferencia, Fiado) y vuelto exacto.",
    pasos: [
      "1. Ingresa a la pantalla **Ventas** desde el menú lateral o el acceso rápido.",
      "2. **Escanea con la pistola de código de barras** o busca por nombre/marca en el buscador.",
      "3. **Usa los Atajos Rápidos de Teclado**: \n   - **F1**: Selecciona **Efectivo** y abre el cobro rápido.\n   - **F2**: Selecciona **Débito**.\n   - **F4**: Selecciona **Transferencia Bancaria**.\n   - **F3**: Selecciona **Fiado** (asociando al cliente).\n   - **ESC**: Cancela la operación o cierra los modales.",
      "4. **Si pagan en Efectivo**: Escribe el monto recibido o usa los botones de billetes ($1.000, $5.000, $10.000, $20.000) para ver el **Vuelto exacto** de inmediato.",
      "5. Presiona **Confirmar cobro** o presiona ENTER para finalizar.",
      "6. Se descontará el stock al instante y podrás imprimir el ticket térmico.",
    ],
    tips: [
      "💡 Puedes presionar la tecla F11 o el botón en la barra superior para alternar Pantalla Completa.",
      "💡 Si presionas la tecla ESC sin ventanas abiertas, la aplicación pasará a modo ventana.",
    ],
    ruta: "/ventas",
    botonTexto: "Ir al Módulo de Ventas",
  },
  {
    id: "atajos-teclado",
    categoria: "ventas",
    titulo: "⌨️ ¿Cuáles son los Atajos de Teclado del Sistema?",
    icono: "bi-keyboard-fill",
    resumen: "Guía rápida de teclas F1, F2, F3, F4, F11 y ESC para agilizar la atención en mostrador.",
    pasos: [
      "• **F1**: Cobro en **Efectivo**.",
      "• **F2**: Cobro con **Tarjeta de Débito**.",
      "• **F4**: Cobro con **Transferencia Bancaria**.",
      "• **F3**: Cobro a **Fiado**.",
      "• **ESC**: Cierra ventanas / modales activos. Si no hay ventanas, cambia la aplicación a modo ventana.",
      "• **F11**: Alterna entre Pantalla Completa y Modo Ventana.",
      "• **Cualquier tecla o clic**: Omite la animación inicial de inicio al instante.",
    ],
    tips: [
      "💡 Utilizar el teclado te permite atender a tus clientes en menos de 5 segundos por venta.",
    ],
    ruta: "/ventas",
    botonTexto: "Probar Atajos en Ventas",
  },
  {
    id: "apertura-cierre-caja",
    categoria: "ventas",
    titulo: "💵 ¿Cómo abrir turno, registrar movimientos y cerrar la Caja?",
    icono: "bi-cash-coin",
    resumen: "Control del efectivo inicial, ingresos, retiros de dinero y arqueo de caja al finalizar la jornada.",
    pasos: [
      "1. Ve a **Caja** en el menú lateral.",
      "2. **Apertura de Turno**: Al iniciar la jornada, presiona **Abrir Caja** e ingresa el monto de sencillo o cambio inicial.",
      "3. **Durante el día**: Cada venta en efectivo se suma sola. Si sacas dinero para gastos o ingresas sencillo, usa **Registrar Movimiento** (Ingreso o Retiro).",
      "4. **Cierre de Turno**: Al finalizar la jornada, haz clic en **Cerrar Caja**.",
      "5. El sistema te mostrará el total esperado en efectivo y el resumen de ventas en tarjetas/transferencias para tu arqueo.",
    ],
    tips: [
      "💡 El arqueo de caja te protege de descuadres y mantiene las cuentas 100% claras día a día.",
    ],
    ruta: "/caja",
    botonTexto: "Ir al Control de Caja",
  },
  {
    id: "reimprimir-anular-venta",
    categoria: "ventas",
    titulo: "📄 ¿Cómo ver el Historial, reimprimir ticket o anular una venta?",
    icono: "bi-clock-history",
    resumen: "Revisa todas las ventas del día, filtra por método (Efectivo, Débito, Transferencia, Fiado) o anula ventas con devolución de stock.",
    pasos: [
      "1. Ingresa a **Historial Ventas** en el menú.",
      "2. Puedes filtrar por estado, método de pago o buscar por número de folio / cliente.",
      "3. **Para Reimprimir**: Presiona el botón con icono de **Impresora 🖨️** junto a la venta.",
      "4. **Para Anular una Venta**: Haz clic en el botón de **Anular (rojo)**. El sistema devolverá automáticamente los productos al inventario.",
    ],
    tips: [
      "💡 Al anular una venta, los productos regresan al stock disponible de forma 100% automática.",
    ],
    ruta: "/ventas/historial",
    botonTexto: "Ver Historial de Ventas",
  },

  // --- PRODUCTOS E INVENTARIO ---
  {
    id: "ingreso-compras-productos",
    categoria: "compras",
    titulo: "🚚 ¿Cómo ingresar Mercadería y Nuevos Productos desde Compras?",
    icono: "bi-truck",
    resumen: "El ingreso de productos y actualización de stock se realiza de forma centralizada y optimizada desde Compras.",
    pasos: [
      "1. Ve a **Compras** y presiona **+ Nueva Compra**.",
      "2. Selecciona el Proveedor (o haz clic en **+ Nuevo Proveedor** para crearlo ahí mismo).",
      "3. **Escanea con la pistola o busca productos**: Si ya existe, se agregará a la tabla; si es un producto nuevo, presiona **+ Crear Nuevo Producto** para registrarlo en el acto.",
      "4. **Sistema Anti-Duplicados**: Si el nombre o código es similar a uno ya existente, el sistema te avisará para evitar duplicar mercadería.",
      "5. Ingresa cantidades y costo de compra, y presiona **Confirmar Compra**.",
      "6. El stock y costos de tu catálogo se actualizarán de inmediato.",
    ],
    tips: [
      "💡 Ya no necesitas ir a módulos separados: desde la misma compra creas proveedores y productos en un solo paso.",
    ],
    ruta: "/compras",
    botonTexto: "Ir a Compras",
  },
  {
    id: "comparativa-proveedores",
    categoria: "compras",
    titulo: "⭐ ¿Cómo saber qué Proveedor me vende más barato?",
    icono: "bi-award-fill",
    resumen: "Analítica de compras que compara automáticamente precios de proveedores y destaca la opción más conveniente.",
    pasos: [
      "1. Dirígete a **Reportes** en el menú lateral.",
      "2. Haz clic en la pestaña **⭐ Comparativa de Proveedores (Mejor Precio)**.",
      "3. El sistema cruzará todas tus compras y te mostrará producto por producto qué proveedor ofrece el precio de costo más bajo con una insignia verde ⭐.",
      "4. Verás el porcentaje y monto en pesos de ahorro por unidad.",
    ],
    tips: [
      "💡 Esta herramienta te ayuda a optimizar tus compras y aumentar el margen de ganancia de tu negocio.",
    ],
    ruta: "/reportes",
    botonTexto: "Ver Comparativa de Precios",
  },
  {
    id: "catalogo-imagenes",
    categoria: "productos",
    titulo: "🖼️ ¿Cómo editar Precios y colocar Imágenes por URL a los Productos?",
    icono: "bi-image-fill",
    resumen: "Edición de precios de venta, costos y asignación de imágenes web en el catálogo.",
    pasos: [
      "1. Ingresa a **Productos** en el menú lateral.",
      "2. Haz clic en el botón de **Editar (Lápiz ✏️)** en el producto deseado.",
      "3. En el campo **Imagen (URL)**, puedes pegar cualquier enlace de imagen web (ej: Walmart, Google, etc.).",
      "4. Modifica precios de venta o stock mínimo según requieras.",
      "5. Presiona **Actualizar Producto** y los cambios se guardarán en tu base de datos SQLite.",
    ],
    tips: [
      "💡 Las imágenes ayudan a reconocer los productos rápidamente en la pantalla de cobro.",
    ],
    ruta: "/productos",
    botonTexto: "Ir a Productos",
  },

  // --- CLIENTES Y FIADOS ---
  {
    id: "gestionar-fiados",
    categoria: "fiados",
    titulo: "👥 ¿Cómo registrar Clientes con RUT válido y controlar Fiados?",
    icono: "bi-people-fill",
    resumen: "Validación estricta de RUT chileno (Módulo 11), control de límite de crédito, cuentas por cobrar y abonos.",
    pasos: [
      "1. Ve a **Clientes** en el menú lateral (o usa **+ Nuevo Cliente** en Ventas).",
      "2. Ingresa el **RUT** del cliente: el sistema lo formateará con puntos y guion automáticamente y validará su dígito verificador.",
      "3. Asigna un **Límite de Fiado** en pesos.",
      "4. **Al Vender Fiado**: En Ventas, presiona F3 (Fiado) y selecciona al cliente.",
      "5. **Para Cobrar Abonos**: Entra a **Clientes**, presiona **Abonar / Pagar** en el cliente deudor e ingresa el monto entregado.",
    ],
    tips: [
      "💡 Puedes imprimir un comprobante térmico de abono para entregárselo al cliente como respaldo de su pago.",
      "💡 Los clientes con deuda aparecen en el Dashboard con su saldo en rojo para fácil cobro.",
    ],
    ruta: "/clientes",
    botonTexto: "Ir a Clientes (Fiados)",
  },

  // --- RESPALDOS Y SEGURIDAD ---
  {
    id: "copias-respaldo",
    categoria: "respaldos",
    titulo: "🛡️ ¿Cómo respaldar la Base de Datos y subirla a la Nube?",
    icono: "bi-shield-check",
    resumen: "Genera copias de seguridad de todas tus ventas, clientes y productos en tu Escritorio y guárdalas en OneDrive o Google Drive.",
    pasos: [
      "1. Dirígete a **Configuración** en el menú lateral.",
      "2. En la sección **Copias de Respaldo**, presiona el botón verde **Crear Respaldo Ahora**.",
      "3. El sistema generará una copia instantánea `.db` y la guardará automáticamente en tu carpeta del Escritorio: `Respaldos_LaPalmera`.",
      "4. Abre tu nube personal (OneDrive o Google Drive) y sube el archivo generado para protegerlo ante cualquier falla del equipo.",
    ],
    tips: [
      "💡 Se recomienda generar un respaldo al final de cada jornada para tener siempre los datos protegidos.",
      "💡 Si alguna vez necesitas restaurar datos pasados, puedes presionar el botón 'Restaurar' junto a cualquier respaldo.",
    ],
    ruta: "/configuracion",
    botonTexto: "Ir a Respaldos",
  },
  {
    id: "restablecer-fabrica",
    categoria: "respaldos",
    titulo: "⚙️ ¿Cómo restablecer el Sistema a valores de Fábrica o cambiar la Ruta SQLite?",
    icono: "bi-arrow-counterclockwise",
    resumen: "Proceso seguro protegido con contraseña del desarrollador para dejar la base de datos limpia en 0 o mover el directorio de datos.",
    pasos: [
      "1. Entra a **Configuración** en el menú lateral.",
      "2. **Para cambiar la Ruta de la Base de Datos**: Ingresa la nueva carpeta en Almacenamiento, presiona **Aplicar Ruta** e introduce la contraseña de seguridad del desarrollador.",
      "3. **Para Restablecer a Fábrica**: Ve a la pestaña **Restablecer de Fábrica**, presiona el botón rojo, e ingresa la contraseña de autorización (`Mixeltnt2012`).",
      "4. El sistema purgará 100% todos los registros de ventas, clientes, compras y productos, dejando el sistema limpio para comenzar desde cero.",
    ],
    tips: [
      "💡 Antes de restablecer a fábrica, se recomienda crear un respaldo previo por precaución.",
    ],
    ruta: "/configuracion",
    botonTexto: "Ir a Configuración",
  },
];

export const AsistenteVirtual = () => {
  const [abierto, setAbierto] = useState(false);
  const [guiaActiva, setGuiaActiva] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const guiasFiltradas = GUIAS.filter((g) => {
    if (categoriaSeleccionada === "todas") return true;
    return g.categoria === categoriaSeleccionada;
  });

  const irA = (ruta) => {
    if (!ruta) return;
    setAbierto(false);
    navigate(ruta);
  };

  return (
    <>
      {/* Zona de Detección en la Esquina (Aparece suavemente al pasar el ratón) */}
      <div
        className={`lp-palmi-corner-hotspot ${isHovered || abierto ? "lp-active" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          className={`btn lp-palmi-trigger-btn ${isHovered || abierto ? "lp-visible" : "lp-hidden"}`}
          onClick={() => setAbierto(!abierto)}
          title="Palmi 🐶 — Manual e Instrucciones del Sistema"
          aria-label="Abrir manual de instrucciones"
        >
          {abierto ? (
            <div className="lp-palmi-close-btn">✕</div>
          ) : (
            <div className="lp-palmi-btn-content">
              <img
                src="/palmi.png"
                alt="Palmi"
                className="lp-palmi-btn-img"
              />
              <span className="lp-palmi-badge-tag">Ayuda 📖</span>
            </div>
          )}
        </button>
      </div>

      {/* Ventana Modal / Panel de Instrucciones */}
      {abierto && (
        <div className="position-fixed card shadow-lg border-0 rounded-4 lp-palmi-modal">
          {/* Header del Asistente */}
          <div className="bg-success text-white p-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center overflow-hidden lp-palmi-modal-avatar">
                <img
                  src="/palmi.png"
                  alt="Palmi"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <div>
                <h6 className="mb-0 fw-bold d-flex align-items-center gap-1">
                  Palmi 🌴🐾 <span className="badge bg-white text-success fs-7 ms-1">v22</span>
                </h6>
                <small className="text-white-50" style={{ fontSize: "0.76rem" }}>
                  Manual e Instrucciones de Uso del Sistema
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setAbierto(false)}
            ></button>
          </div>

          {/* Cuerpo del Asistente */}
          <div className="p-3 bg-light overflow-auto flex-grow-1" style={{ fontSize: "0.88rem" }}>
            {/* Mensaje de bienvenida de Palmi */}
            <div className="bg-white p-3 rounded-3 shadow-sm mb-3 border">
              <div className="d-flex align-items-center gap-3">
                <img
                  src="/palmi.png"
                  alt="Palmi"
                  className="rounded-circle shadow-sm"
                  style={{ width: 44, height: 44, objectFit: "cover", flexShrink: 0 }}
                />
                <div>
                  <p className="mb-0 text-dark fw-medium">
                    ¡Hola! Soy <strong>Palmi</strong> 🐶. Selecciona un módulo para ver el paso a paso detallado de cómo usar cada función:
                  </p>
                </div>
              </div>
            </div>

            {/* Selector de Categorías / Módulos */}
            <div className="d-flex gap-1 overflow-auto pb-2 mb-3 lp-cat-bar">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`btn btn-sm text-nowrap rounded-pill px-3 py-1 fw-semibold lp-cat-pill ${
                    categoriaSeleccionada === cat.id
                      ? "btn-success text-white shadow-sm"
                      : "btn-white text-secondary border bg-white"
                  }`}
                  onClick={() => {
                    setCategoriaSeleccionada(cat.id);
                    setGuiaActiva(null);
                  }}
                  style={{ fontSize: "0.78rem" }}
                >
                  <i className={`bi ${cat.icono} me-1`}></i>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Vista de Guía Detallada */}
            {guiaActiva ? (
              <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white mb-2">
                <div className="card-header bg-success bg-opacity-10 border-0 p-3 d-flex align-items-center justify-content-between">
                  <span className="fw-bold text-success d-flex align-items-center gap-2">
                    <i className={`bi ${guiaActiva.icono} fs-5`}></i>
                    {guiaActiva.titulo}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                    onClick={() => setGuiaActiva(null)}
                    style={{ fontSize: "0.75rem" }}
                  >
                    ← Volver a lista
                  </button>
                </div>

                <div className="card-body p-3">
                  <p className="text-secondary small mb-3 fst-italic">
                    {guiaActiva.resumen}
                  </p>

                  <h6 className="fw-bold text-dark mb-2" style={{ fontSize: "0.84rem" }}>
                    📋 Paso a paso:
                  </h6>
                  <div className="d-flex flex-column gap-2 mb-3">
                    {guiaActiva.pasos.map((paso, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-light rounded border-start border-3 border-success text-dark small"
                      >
                        {paso}
                      </div>
                    ))}
                  </div>

                  {guiaActiva.tips && guiaActiva.tips.length > 0 && (
                    <div className="p-2 bg-warning bg-opacity-10 rounded border border-warning border-opacity-25 mb-3">
                      {guiaActiva.tips.map((tip, idx) => (
                        <div key={idx} className="small text-dark" style={{ fontSize: "0.78rem" }}>
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  {guiaActiva.ruta && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                      onClick={() => irA(guiaActiva.ruta)}
                    >
                      <span>{guiaActiva.botonTexto || "Ir a esta pantalla"}</span>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Lista de Guías e Instrucciones */
              <div className="d-flex flex-column gap-2 mb-2">
                {guiasFiltradas.map((guia) => (
                  <div
                    key={guia.id}
                    className="card border shadow-sm rounded-3 p-3 bg-white lp-guia-item-card"
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onClick={() => setGuiaActiva(guia)}
                  >
                    <div className="d-flex align-items-start gap-2">
                      <div className="bg-success bg-opacity-10 text-success rounded-circle p-2 flex-shrink-0">
                        <i className={`bi ${guia.icono} fs-5`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 text-dark fw-bold" style={{ fontSize: "0.88rem" }}>
                          {guia.titulo}
                        </h6>
                        <p className="mb-2 text-muted small" style={{ fontSize: "0.78rem" }}>
                          {guia.resumen}
                        </p>
                        <span className="text-success fw-semibold small" style={{ fontSize: "0.74rem" }}>
                          Ver instrucciones completas →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer del Asistente con Accesos Rápidos */}
          <div className="p-2 bg-white border-top">
            <div className="d-flex justify-content-around text-center small">
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none text-muted py-1 px-1"
                onClick={() => irA("/ventas")}
                title="Ventas"
              >
                <i className="bi bi-cart3 d-block fs-6 text-success"></i>Ventas
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none text-muted py-1 px-1"
                onClick={() => irA("/productos")}
                title="Productos"
              >
                <i className="bi bi-box-seam d-block fs-6 text-primary"></i>Productos
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none text-muted py-1 px-1"
                onClick={() => irA("/clientes")}
                title="Fiados"
              >
                <i className="bi bi-people d-block fs-6 text-warning"></i>Fiados
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none text-muted py-1 px-1"
                onClick={() => irA("/caja")}
                title="Caja"
              >
                <i className="bi bi-cash-stack d-block fs-6 text-info"></i>Caja
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none text-muted py-1 px-1"
                onClick={() => irA("/configuracion")}
                title="Respaldos"
              >
                <i className="bi bi-shield-check d-block fs-6 text-danger"></i>Respaldos
              </button>
            </div>
            <div className="text-center text-muted border-top pt-1" style={{ fontSize: "0.72rem" }}>
              Desarrollado por MixelTNT
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AsistenteVirtual;
