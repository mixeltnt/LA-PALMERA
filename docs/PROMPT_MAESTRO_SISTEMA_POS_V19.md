# 🚀 PROMPT MAESTRO: SISTEMA DE PUNTO DE VENTA & GESTIÓN COMERCIAL (POS / ERP) OFFLINE-FIRST v19

```markdown
Actúa como un Arquitecto de Software Senior y Desarrollador Full-Stack experto en React, TypeScript, Rust, Tauri y SQLite. Tu objetivo es diseñar, implementar y empaquetar un Sistema de Punto de Venta (POS) y Gestión Comercial de Escritorio 100% Offline-First para Windows, con arquitectura robusta, alta velocidad, máxima seguridad y estética profesional.

---

### 1. ARQUITECTURA TECNOLÓGICA Y ENTORNO
- **Frontend**: React 19 + TypeScript + Vite + Bootstrap 5 + Bootstrap Icons.
- **Backend / Desktop Engine**: Tauri v2 (Rust) empaquetado en binario nativo ejecutable (.exe) para Windows con WebView2.
- **Base de Datos Principal**: SQLite local autónomo ubicado de forma persistente en `C:\LaPalmera\database\lapalmera.db` (independiente de los archivos del programa).
- **Modo Web/Fallback**: `BrowserFallbackDB` en `localStorage` sincronizado con la misma interfaz para pruebas y desarrollo.
- **Instalador Nativo**: Instalador compilado en Rust (.exe) en 1 clic que:
  - Extrae los binarios a `%LOCALAPPDATA%\Programs\LaPalmera\`.
  - Inicializa la estructura `C:\LaPalmera\` (carpetas `database`, `backups`, `images`, `exports`, `config`) sin sobreescribir datos existentes.
  - Crea accesos directos en el Escritorio y Menú Inicio con icono personalizado (.ico).
  - Registra el desinstalador formal en Panel de Control / Configuración de Windows.

---

### 2. SEGURIDAD, ACCESOS Y ROLES DE USUARIO
- **Control de Roles**:
  1. `admin` (Administrador general con acceso total a métricas, compras, inventario, usuarios, configuración y restablecimiento).
  2. `supervisor` (Supervisión de caja, anulación de ventas, arqueos y reportes).
  3. `cajero` (Punto de venta y emisión de boletas/tickets rápidos).
- **Módulo de Login**:
  - Selector intuitivo de usuario o ingreso de credenciales.
  - Botón de acceso directo "⚡ Abrir Punto de Venta / Caja" para cajero rápido sin contraseña.
  - Control de visibilidad de contraseña (ojo) con supresión nativa de iconos duplicados del navegador (`::-ms-reveal` / `::-ms-clear`).
  - Cierre de sesión y protección de rutas privadas mediante Contexto de Autenticación (`AuthContext`).

---

### 3. MÓDULOS DEL SISTEMA

#### A. Punto de Venta (POS / Caja)
- Interfaz rápida optimizada para teclado y lector de código de barras.
- **Teclas Rápidas**:
  - `F1`: Cobro en Efectivo con cálculo de vuelto inmediato.
  - `F2`: Cobro con Tarjeta / Débito.
  - `F3`: Cobro a Cuenta / Fiado (con búsqueda y validación de límite de crédito del cliente).
  - `ESC`: Cancelar cobro, cerrar modales o limpiar venta actual.
- **Audio Feedback**: Sonido sintetizado con Web Audio API (Beep de escaneo exitoso, error de stock y acorde de venta completada).
- **Botones de Acceso Rápido / Granel**: Productos frecuentes con un toque (Pan, Huevos, Cecinas, etc.).
- Impresión y exportación de comprobante / ticket térmico (formato 80mm y 58mm).

#### B. Clientes, Cuentas Corrientes y Fiados
- Gestión de clientes: Nombre, RUT, Teléfono, Dirección, Comuna, Límite de Crédito y Saldo Deudor.
- Cálculo automático de **Cupo Disponible**: `Límite Fiado - Deuda Pendiente`.
- Módulo de **Abonos a Cuenta**:
  - Registro de pagos parciales o totales de deuda.
  - Generación e impresión de **Voucher Térmico de Abono** con detalle de saldo anterior, monto pagado y saldo restante.

#### C. Catálogo de Productos e Inventario (Kardex)
- Catálogo con Código, Código de Barras, Nombre, Categoría, Precio de Venta, Precio de Costo y Stock Actual.
- Alertas de Stock Bajo configurables por producto.
- Registro transaccional de movimientos de inventario (Kardex: Entradas por compra, Salidas por venta, Ajustes manuales).
- Eliminación individual y múltiple transaccional con integridad referencial.

#### D. Compras a Proveedores
- Registro de compras con Folio, Factura, Proveedor, desglose de ítems, costo unitario y total.
- Incremento automático del stock de los productos comprados al completar la factura.

#### E. Control y Turnos de Caja (Apertura y Cierre)
- Apertura de turno con monto inicial en efectivo.
- Arqueo de caja en tiempo real: Desglose de ventas en Efectivo, Débito, Crédito, Transferencia y Fiados.
- Registro de movimientos de caja (Ingresos y Retiros de dinero con concepto).
- Cierre de caja con cálculo de diferencia (Sobrante / Faltante) y resumen imprimible.

#### F. Dashboard & Métricas Financieras
- KPIs en tiempo real:
  - Ventas del Día y Ventas del Mes.
  - **Ganancia Neta Real**: `Total Vendido - Costo de Productos Vendidos` con porcentaje de margen.
  - Cuentas por Cobrar (Total adeudado en fiados y cantidad de clientes con deuda).
  - Compras del período y alertas de stock crítico.
  - Tabla de últimas ventas y deudores principales.

#### G. Copias de Seguridad (Respaldos) & Nube
- Creación de copias de seguridad de la base de datos con un clic.
- Generación con fecha y hora (`Respaldo_Ventas_AAAA-MM-DD_HH-mm.db`).
- Carpeta configurable en el Escritorio para sincronización manual o automática con OneDrive, Google Drive o pendrive.
- Restauración segura de cualquier copia histórica desde la interfaz.

#### H. Restablecimiento de Fábrica (Desde Cero)
- Función para dejar el sistema 100% limpio como recién instalado tras finalizar pruebas.
- **Protección de Seguridad**: Requiere confirmación con contraseña maestra autorizada (`Mixeltnt2012`).
- Purgado seguro de todas las transacciones (ventas, clientes, deudas, compras, caja, inventario y productos) conservando únicamente la configuración base, los usuarios oficiales y las categorías.
- Recarga y redirección automática con métricas en $0.

---

### 4. EXPERIENCIA DE USUARIO (UX/UI) Y CONTROL DE PANTALLA
- **Pantalla Completa Nativa**: Inicia maximizado y permite alternar a Modo Ventana o Pantalla Completa con la tecla `ESC` o `F11`.
- **Diseño Glassmorphism / Moderno**: Paleta de colores armoniosa (Dark/Emerald/Slate), tipografía moderna (`Inter`), sombras suaves y micro-animaciones.
- **Asistente Virtual Integrado**: Modal con guía de ayuda y manual de uso interactivo para el operador.
```
