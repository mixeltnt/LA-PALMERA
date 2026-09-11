-- Esquema Relacional PostgreSQL para La Palmera POS Online
-- Diseñado para sincronización unidireccional espejo desde SQLite Local, reportes y futuro panel web/móvil

-- 1. Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  apellido VARCHAR(150),
  rol VARCHAR(50) NOT NULL DEFAULT 'cajero',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  email VARCHAR(150),
  telefono VARCHAR(50),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  nombre VARCHAR(150) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  color VARCHAR(50) DEFAULT '#2563eb',
  icono VARCHAR(50) DEFAULT 'bi-tag',
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  rut VARCHAR(50) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  contacto VARCHAR(150),
  telefono VARCHAR(50),
  email VARCHAR(150),
  direccion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  codigo VARCHAR(100) UNIQUE NOT NULL,
  codigo_barras VARCHAR(100),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  marca VARCHAR(150),
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  categoria_nombre VARCHAR(150),
  proveedor_nombre VARCHAR(200),
  precio_venta NUMERIC(14,2) NOT NULL DEFAULT 0,
  precio_costo NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_actual NUMERIC(14,3) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(14,3) NOT NULL DEFAULT 5,
  unidad_medida VARCHAR(50) DEFAULT 'unidad',
  permite_decimales BOOLEAN DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  imagen_url TEXT,
  aplica_iva BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_pg_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_pg_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pg_productos_activo ON productos(activo);

-- 6. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  rut VARCHAR(50) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(150),
  direccion TEXT,
  ciudad VARCHAR(100),
  limite_credito NUMERIC(14,2) DEFAULT 0,
  saldo_deudor NUMERIC(14,2) DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_clientes_rut ON clientes(rut);

-- 7. Tabla de Sesiones de Caja (Turnos)
CREATE TABLE IF NOT EXISTS caja_sesiones (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER UNIQUE,
  usuario_id INTEGER,
  usuario_nombre VARCHAR(150),
  fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  monto_inicial NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_cierre TIMESTAMP WITH TIME ZONE,
  monto_esperado_efectivo NUMERIC(14,2) DEFAULT 0,
  monto_real_efectivo NUMERIC(14,2) DEFAULT 0,
  diferencia NUMERIC(14,2) DEFAULT 0,
  total_ventas_efectivo NUMERIC(14,2) DEFAULT 0,
  total_ventas_debito NUMERIC(14,2) DEFAULT 0,
  total_ventas_credito NUMERIC(14,2) DEFAULT 0,
  total_ventas_transferencia NUMERIC(14,2) DEFAULT 0,
  total_ingresos_extra NUMERIC(14,2) DEFAULT 0,
  total_egresos_extra NUMERIC(14,2) DEFAULT 0,
  estado VARCHAR(50) NOT NULL DEFAULT 'abierta',
  observaciones TEXT
);

-- 8. Tabla de Movimientos de Caja
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  caja_sesion_id INTEGER REFERENCES caja_sesiones(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  concepto TEXT NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER,
  usuario_nombre VARCHAR(150)
);

-- 9. Tabla de Ventas (Cabecera)
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  folio INTEGER UNIQUE NOT NULL,
  numero_boleta VARCHAR(100),
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cajero_id INTEGER,
  cajero_nombre VARCHAR(150),
  caja_sesion_id INTEGER,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(200),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  descuento_total NUMERIC(14,2) DEFAULT 0,
  impuesto_total NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_recibido NUMERIC(14,2) DEFAULT 0,
  vuelto NUMERIC(14,2) DEFAULT 0,
  metodo_pago_principal VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  estado VARCHAR(50) NOT NULL DEFAULT 'completada',
  motivo_anulacion TEXT,
  notas TEXT,
  sincronizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_ventas_folio ON ventas(folio);
CREATE INDEX IF NOT EXISTS idx_pg_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_pg_ventas_cajero ON ventas(cajero_id);
CREATE INDEX IF NOT EXISTS idx_pg_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pg_ventas_estado ON ventas(estado);

-- 10. Tabla de Ítems de Venta (Detalle)
CREATE TABLE IF NOT EXISTS venta_items (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo VARCHAR(100) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  cantidad NUMERIC(14,3) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(14,2) DEFAULT 0,
  descuento NUMERIC(14,2) DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pg_venta_items_venta ON venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_pg_venta_items_producto ON venta_items(producto_id);

-- 11. Tabla de Pagos de Venta
CREATE TABLE IF NOT EXISTS venta_pagos (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  metodo VARCHAR(50) NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  referencia TEXT
);

CREATE INDEX IF NOT EXISTS idx_pg_venta_pagos_venta ON venta_pagos(venta_id);

-- 12. Tabla de Movimientos de Cuenta Corriente / Fiados de Clientes
CREATE TABLE IF NOT EXISTS cliente_movimientos (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(50) NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  saldo_resultante NUMERIC(14,2) NOT NULL,
  observacion TEXT,
  venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  usuario_id INTEGER,
  estado VARCHAR(50) NOT NULL DEFAULT 'ACTIVO',
  fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_cliente_mov_cliente ON cliente_movimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pg_cliente_mov_fecha ON cliente_movimientos(fecha);

-- 13. Tabla de Compras
CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  folio INTEGER UNIQUE,
  numero_factura VARCHAR(100),
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  proveedor_nombre VARCHAR(200),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  impuesto_total NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado VARCHAR(50) NOT NULL DEFAULT 'completada',
  usuario_id INTEGER,
  usuario_nombre VARCHAR(150),
  notas TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_compras_fecha ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_pg_compras_proveedor ON compras(proveedor_id);

-- 14. Tabla de Ítems de Compra
CREATE TABLE IF NOT EXISTS compra_items (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo VARCHAR(100) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  cantidad NUMERIC(14,3) NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pg_compra_items_compra ON compra_items(compra_id);

-- 15. Tabla de Movimientos de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id SERIAL PRIMARY KEY,
  sqlite_id INTEGER,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  producto_nombre VARCHAR(255),
  tipo VARCHAR(50) NOT NULL,
  cantidad NUMERIC(14,3) NOT NULL,
  stock_anterior NUMERIC(14,3) NOT NULL,
  stock_nuevo NUMERIC(14,3) NOT NULL,
  motivo TEXT,
  referencia_id INTEGER,
  usuario_id INTEGER,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pg_inv_mov_producto ON inventario_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_pg_inv_mov_fecha ON inventario_movimientos(fecha);

-- 16. Tabla de Logs y Auditoría de Sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  origen_dispositivo VARCHAR(100) DEFAULT 'pos_desktop',
  total_items INTEGER NOT NULL DEFAULT 0,
  procesados_ok INTEGER NOT NULL DEFAULT 0,
  procesados_fallidos INTEGER NOT NULL DEFAULT 0,
  detalles JSONB,
  ip_cliente VARCHAR(50),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Tabla de Operaciones Sincronizadas Idempotentes (Control técnico de operation_id)
CREATE TABLE IF NOT EXISTS sync_processed_operations (
  operation_id VARCHAR(150) PRIMARY KEY,
  tabla VARCHAR(50) NOT NULL,
  registro_id INTEGER,
  operacion VARCHAR(20) NOT NULL,
  resultado_pg_id INTEGER,
  procesado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_op_tabla ON sync_processed_operations(tabla);
