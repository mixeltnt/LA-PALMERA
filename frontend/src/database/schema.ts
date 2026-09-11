// Definición de esquema SQLite para La Palmera POS

export const CREATE_TABLES_SQL = `
-- Tabla de Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  actualizado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT,
  rol TEXT NOT NULL CHECK(rol IN ('admin', 'cajero', 'supervisor')),
  activo INTEGER NOT NULL DEFAULT 1,
  email TEXT,
  telefono TEXT,
  creado_en TEXT DEFAULT (datetime('now', 'localtime')),
  actualizado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  color TEXT DEFAULT '#2563eb',
  icono TEXT DEFAULT 'bi-tag',
  orden INTEGER DEFAULT 0
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  codigo_barras TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  marca TEXT,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  precio_venta REAL NOT NULL DEFAULT 0,
  precio_costo REAL NOT NULL DEFAULT 0,
  stock_actual REAL NOT NULL DEFAULT 0,
  stock_minimo REAL NOT NULL DEFAULT 5,
  unidad_medida TEXT DEFAULT 'unidad',
  permite_decimales INTEGER DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  imagen_url TEXT,
  aplica_iva INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now', 'localtime')),
  actualizado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Índices de productos
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rut TEXT UNIQUE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  ciudad TEXT,
  limite_credito REAL DEFAULT 0,
  saldo_deudor REAL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de Movimientos de Cuenta Corriente / Fiados de Clientes
CREATE TABLE IF NOT EXISTS cliente_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_movimiento TEXT NOT NULL,
  monto REAL NOT NULL,
  saldo_resultante REAL NOT NULL,
  observacion TEXT,
  venta_id INTEGER REFERENCES ventas(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  estado TEXT NOT NULL DEFAULT 'ACTIVO',
  fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_cliente_mov_cliente ON cliente_movimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_mov_fecha ON cliente_movimientos(fecha);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rut TEXT UNIQUE,
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de Sesiones de Caja (Turnos)
CREATE TABLE IF NOT EXISTS caja_sesiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  usuario_nombre TEXT,
  fecha_apertura TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  monto_inicial REAL NOT NULL DEFAULT 0,
  fecha_cierre TEXT,
  monto_esperado_efectivo REAL DEFAULT 0,
  monto_real_efectivo REAL DEFAULT 0,
  diferencia REAL DEFAULT 0,
  total_ventas_efectivo REAL DEFAULT 0,
  total_ventas_debito REAL DEFAULT 0,
  total_ventas_credito REAL DEFAULT 0,
  total_ventas_transferencia REAL DEFAULT 0,
  total_ingresos_extra REAL DEFAULT 0,
  total_egresos_extra REAL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK(estado IN ('abierta', 'cerrada')),
  observaciones TEXT
);

-- Tabla de Movimientos de Caja (Ingresos / Retiros)
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_sesion_id INTEGER NOT NULL REFERENCES caja_sesiones(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso', 'apertura', 'cierre')),
  monto REAL NOT NULL,
  concepto TEXT NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  usuario_id INTEGER REFERENCES usuarios(id),
  usuario_nombre TEXT
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio INTEGER,
  numero_boleta TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  cajero_id INTEGER NOT NULL REFERENCES usuarios(id),
  cajero_nombre TEXT,
  caja_sesion_id INTEGER REFERENCES caja_sesiones(id),
  cliente_id INTEGER REFERENCES clientes(id),
  cliente_nombre TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  descuento_total REAL DEFAULT 0,
  impuesto_total REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  monto_recibido REAL DEFAULT 0,
  vuelto REAL DEFAULT 0,
  metodo_pago_principal TEXT NOT NULL DEFAULT 'efectivo',
  estado TEXT NOT NULL DEFAULT 'completada' CHECK(estado IN ('completada', 'anulada', 'pendiente')),
  motivo_anulacion TEXT,
  notas TEXT,
  sincronizado INTEGER DEFAULT 0,
  creado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cajero ON ventas(cajero_id);
CREATE INDEX IF NOT EXISTS idx_ventas_sesion ON ventas(caja_sesion_id);
CREATE INDEX IF NOT EXISTS idx_ventas_sincronizado ON ventas(sincronizado);

-- Tabla de Ítems de Venta
CREATE TABLE IF NOT EXISTS venta_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cantidad REAL NOT NULL DEFAULT 1,
  precio_unitario REAL NOT NULL,
  costo_unitario REAL DEFAULT 0,
  descuento REAL DEFAULT 0,
  subtotal REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto ON venta_items(producto_id);

-- Tabla de Pagos de Venta
CREATE TABLE IF NOT EXISTS venta_pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL,
  monto REAL NOT NULL,
  referencia TEXT
);

-- Tabla de Compras a Proveedores
CREATE TABLE IF NOT EXISTS compras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio INTEGER,
  numero_factura TEXT,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  subtotal REAL NOT NULL DEFAULT 0,
  impuesto_total REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'completada' CHECK(estado IN ('completada', 'anulada', 'pendiente')),
  usuario_id INTEGER REFERENCES usuarios(id),
  usuario_nombre TEXT,
  notas TEXT,
  creado_en TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Tabla de Ítems de Compra
CREATE TABLE IF NOT EXISTS compra_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cantidad REAL NOT NULL,
  costo_unitario REAL NOT NULL,
  subtotal REAL NOT NULL
);

-- Tabla de Movimientos de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  producto_nombre TEXT,
  tipo TEXT NOT NULL,
  cantidad REAL NOT NULL,
  stock_anterior REAL NOT NULL,
  stock_nuevo REAL NOT NULL,
  motivo TEXT,
  referencia_id INTEGER,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_producto ON inventario_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_fecha ON inventario_movimientos(fecha);

-- Tabla de Respaldos
CREATE TABLE IF NOT EXISTS respaldos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'manual',
  descripcion TEXT,
  creado_en TEXT DEFAULT (datetime('now', 'localtime')),
  checksum TEXT
);

-- Cola de Sincronización Online (Para sincronización posterior)
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT UNIQUE,
  tabla TEXT NOT NULL,
  registro_id INTEGER NOT NULL,
  operacion TEXT NOT NULL CHECK(operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  payload_json TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'sincronizando', 'en_proceso', 'completado', 'error')),
  intentos INTEGER DEFAULT 0,
  ultimo_error TEXT,
  creado_en TEXT DEFAULT (datetime('now', 'localtime')),
  sincronizado_en TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_estado ON sync_queue(estado);
CREATE INDEX IF NOT EXISTS idx_sync_queue_op_id ON sync_queue(operation_id);
`;
