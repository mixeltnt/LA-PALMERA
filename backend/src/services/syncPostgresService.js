// Servicio de sincronización robusto e idempotente hacia PostgreSQL para La Palmera POS
// Implementa idempotencia en doble capa: por operation_id técnico y por entidad de negocio.
import { getClient, query, getPostgresStatus } from '../config/postgres.js';

export const syncPostgresService = {
  /**
   * Procesa un lote de operaciones pendientes enviadas desde SQLite local
   * Cada operación se procesa de manera IDEMPOTENTE para evitar duplicados en reintentos.
   */
  async processPushBatch(items, clientIp = '127.0.0.1') {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, processed: 0, results: [] };
    }

    const client = await getClient();
    const results = [];
    let okCount = 0;
    let failCount = 0;

    try {
      await client.query('BEGIN');

      for (const item of items) {
        const { id, tabla, registro_id, operacion, payload_json } = item;
        const operationId = item.operation_id || item.operationId || `op_${tabla}_${registro_id || id}_${Date.now()}`;
        let payload = {};

        try {
          payload = typeof payload_json === 'string' ? JSON.parse(payload_json) : (payload_json || {});
        } catch (e) {
          results.push({ id, operation_id: operationId, tabla, registro_id, status: 'error', error: 'Payload JSON inválido' });
          failCount++;
          continue;
        }

        try {
          // ===================================================================
          // CAPA 1: Idempotencia Técnica por operation_id
          // ===================================================================
          const checkOp = await client.query(
            'SELECT operation_id, resultado_pg_id FROM sync_processed_operations WHERE operation_id = $1',
            [operationId]
          );

          if (checkOp.rows.length > 0) {
            results.push({
              id,
              operation_id: operationId,
              tabla,
              registro_id,
              status: 'synced',
              pg_id: checkOp.rows[0].resultado_pg_id,
              note: 'Operación confirmada previamente por operation_id (Idempotencia)',
            });
            okCount++;
            continue;
          }

          let pgResultId = null;

          // ===================================================================
          // CAPA 2: Lógica de Entidades de Negocio
          // ===================================================================

          // 1. VENTAS
          if (tabla === 'ventas' || tabla === 'venta') {
            const folio = Number(payload.folio || payload.numeroVenta || payload.id || registro_id);
            const numeroBoleta = payload.numeroBoleta || payload.numero_boleta || `BOL-${folio}`;
            const fecha = payload.fecha || new Date().toISOString();
            const cajeroId = Number(payload.cajeroId || payload.cajero_id || 1);
            const cajeroNombre = payload.cajeroNombre || payload.cajero_nombre || 'Cajero';
            const subtotal = Number(payload.subtotal ?? payload.total ?? 0);
            const descuentoTotal = Number(payload.descuentoTotal ?? payload.descuento_total ?? 0);
            const impuestoTotal = Number(payload.impuestoTotal ?? payload.impuesto_total ?? 0);
            const total = Number(payload.total ?? 0);
            const montoRecibido = Number(payload.montoRecibido ?? payload.monto_recibido ?? total);
            const vuelto = Number(payload.vuelto ?? 0);
            const metodoPago = String(payload.metodoPagoPrincipal || payload.metodo_pago_principal || payload.metodoPago || 'efectivo').toLowerCase();
            const estado = String(payload.estado || 'completada').toLowerCase();
            const motivoAnulacion = payload.motivoAnulacion || payload.motivo_anulacion || null;
            const notas = payload.notas || null;

            // Idempotencia por Folio único de venta
            const checkVenta = await client.query('SELECT id, estado FROM ventas WHERE folio = $1', [folio]);

            if (checkVenta.rows.length > 0) {
              pgResultId = checkVenta.rows[0].id;
              // Si cambió de estado (ej: anulada), actualizar
              await client.query(
                `UPDATE ventas SET 
                  estado = $1, motivo_anulacion = $2, notas = COALESCE($3, notas),
                  sincronizado_en = CURRENT_TIMESTAMP
                 WHERE id = $4`,
                [estado, motivoAnulacion, notas, pgResultId]
              );
            } else {
              let clientePgId = null;
              if (payload.clienteId || payload.cliente_id || payload.cliente?.rut || payload.cliente?.id) {
                const cRut = payload.cliente?.rut || payload.rut;
                if (cRut) {
                  const cRes = await client.query('SELECT id FROM clientes WHERE rut = $1', [cRut]);
                  if (cRes.rows.length > 0) clientePgId = cRes.rows[0].id;
                }
              }

              const insertRes = await client.query(
                `INSERT INTO ventas (
                  sqlite_id, folio, numero_boleta, fecha, cajero_id, cajero_nombre,
                  cliente_id, cliente_nombre, subtotal, descuento_total, impuesto_total,
                  total, monto_recibido, vuelto, metodo_pago_principal, estado,
                  motivo_anulacion, notas, sincronizado_en
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
                RETURNING id`,
                [
                  Number(payload.id || registro_id),
                  folio,
                  numeroBoleta,
                  fecha,
                  cajeroId,
                  cajeroNombre,
                  clientePgId,
                  payload.clienteNombre || payload.cliente_nombre || (payload.cliente?.nombre) || null,
                  subtotal,
                  descuentoTotal,
                  impuestoTotal,
                  total,
                  montoRecibido,
                  vuelto,
                  metodoPago,
                  estado,
                  motivoAnulacion,
                  notas,
                ]
              );
              pgResultId = insertRes.rows[0].id;

              // Insertar ítems de la venta
              const items = payload.items || payload.venta_items || [];
              if (Array.isArray(items)) {
                for (const it of items) {
                  let prodPgId = null;
                  if (it.codigo) {
                    const pRes = await client.query('SELECT id FROM productos WHERE codigo = $1', [it.codigo]);
                    if (pRes.rows.length > 0) prodPgId = pRes.rows[0].id;
                  }

                  await client.query(
                    `INSERT INTO venta_items (
                      sqlite_id, venta_id, producto_id, codigo, nombre,
                      cantidad, precio_unitario, costo_unitario, descuento, subtotal
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                      Number(it.id || 0),
                      pgResultId,
                      prodPgId,
                      it.codigo || '',
                      it.nombre || 'Producto',
                      Number(it.cantidad || 1),
                      Number(it.precioUnitario ?? it.precio_unitario ?? 0),
                      Number(it.costoUnitario ?? it.costo_unitario ?? 0),
                      Number(it.descuento || 0),
                      Number(it.subtotal || 0),
                    ]
                  );
                }
              }

              // Insertar pagos de la venta
              const pagos = payload.pagos || payload.venta_pagos || [];
              if (Array.isArray(pagos) && pagos.length > 0) {
                for (const p of pagos) {
                  await client.query(
                    `INSERT INTO venta_pagos (
                      sqlite_id, venta_id, metodo, monto, referencia
                    ) VALUES ($1, $2, $3, $4, $5)`,
                    [
                      Number(p.id || 0),
                      pgResultId,
                      p.metodo || metodoPago,
                      Number(p.monto || total),
                      p.referencia || null,
                    ]
                  );
                }
              } else {
                await client.query(
                  `INSERT INTO venta_pagos (venta_id, metodo, monto) VALUES ($1, $2, $3)`,
                  [pgResultId, metodoPago, total]
                );
              }
            }

            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', pg_id: pgResultId, folio });
            okCount++;
          }

          // 2. PRODUCTOS
          else if (tabla === 'productos' || tabla === 'producto') {
            const codigo = String(payload.codigo || '').trim();
            const numId = Number(payload.id || registro_id || 0);

            if (operacion === 'DELETE') {
              // Soft delete seguro para proteger claves foráneas y ventas históricas
              const delRes = await client.query(
                `UPDATE productos SET activo = FALSE, actualizado_en = CURRENT_TIMESTAMP 
                 WHERE (codigo = $1 AND $1 <> '') OR (sqlite_id = $2 AND $2 > 0)
                 RETURNING id`,
                [codigo, numId]
              );
              pgResultId = delRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', note: 'Producto desactivado (Soft Delete)' });
              okCount++;
            } else {
              if (!codigo) {
                results.push({ id, operation_id: operationId, tabla, registro_id, status: 'error', error: 'Código de producto vacío' });
                failCount++;
                continue;
              }

              const pRes = await client.query(
                `INSERT INTO productos (
                  sqlite_id, codigo, codigo_barras, nombre, descripcion, marca,
                  precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida,
                  permite_decimales, activo, imagen_url, aplica_iva, actualizado_en
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
                ON CONFLICT (codigo) DO UPDATE SET
                  sqlite_id = EXCLUDED.sqlite_id,
                  codigo_barras = COALESCE(EXCLUDED.codigo_barras, productos.codigo_barras),
                  nombre = EXCLUDED.nombre,
                  descripcion = COALESCE(EXCLUDED.descripcion, productos.descripcion),
                  marca = COALESCE(EXCLUDED.marca, productos.marca),
                  precio_venta = EXCLUDED.precio_venta,
                  precio_costo = EXCLUDED.precio_costo,
                  stock_actual = EXCLUDED.stock_actual,
                  stock_minimo = EXCLUDED.stock_minimo,
                  unidad_medida = EXCLUDED.unidad_medida,
                  permite_decimales = EXCLUDED.permite_decimales,
                  activo = EXCLUDED.activo,
                  imagen_url = COALESCE(EXCLUDED.imagen_url, productos.imagen_url),
                  aplica_iva = EXCLUDED.aplica_iva,
                  actualizado_en = CURRENT_TIMESTAMP
                RETURNING id`,
                [
                  numId,
                  codigo,
                  payload.codigoBarras || payload.codigo_barras || null,
                  payload.nombre || 'Producto',
                  payload.descripcion || null,
                  payload.marca || null,
                  Number(payload.precioVenta ?? payload.precio_venta ?? 0),
                  Number(payload.precioCosto ?? payload.precio_costo ?? 0),
                  Number(payload.stockActual ?? payload.stock_actual ?? 0),
                  Number(payload.stockMinimo ?? payload.stock_minimo ?? 5),
                  payload.unidadMedida || payload.unidad_medida || 'unidad',
                  Boolean(payload.permiteDecimales ?? payload.permite_decimales ?? false),
                  payload.activo !== false,
                  payload.imagenUrl || payload.imagen_url || null,
                  payload.aplicaIva !== false,
                ]
              );

              pgResultId = pRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', codigo, pg_id: pgResultId });
              okCount++;
            }
          }

          // 3. CATEGORÍAS
          else if (tabla === 'categorias' || tabla === 'categoria') {
            const nombre = String(payload.nombre || '').trim();
            const numId = Number(payload.id || registro_id || 0);

            if (operacion === 'DELETE') {
              const delRes = await client.query(
                `UPDATE categorias SET activo = FALSE 
                 WHERE (sqlite_id = $1 AND $1 > 0) OR (nombre = $2 AND $2 <> '')
                 RETURNING id`,
                [numId, nombre]
              );
              pgResultId = delRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', note: 'Categoría desactivada (Soft Delete)' });
              okCount++;
            } else if (nombre) {
              const cRes = await client.query(
                `INSERT INTO categorias (sqlite_id, nombre, descripcion, activo, color, icono)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (nombre) DO UPDATE SET
                   sqlite_id = EXCLUDED.sqlite_id,
                   descripcion = COALESCE(EXCLUDED.descripcion, categorias.descripcion),
                   activo = EXCLUDED.activo,
                   color = COALESCE(EXCLUDED.color, categorias.color),
                   icono = COALESCE(EXCLUDED.icono, categorias.icono)
                 RETURNING id`,
                [
                  numId,
                  nombre,
                  payload.descripcion || null,
                  payload.activo !== false,
                  payload.color || '#2563eb',
                  payload.icono || 'bi-tag',
                ]
              );
              pgResultId = cRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', nombre, pg_id: pgResultId });
              okCount++;
            }
          }

          // 4. CLIENTES
          else if (tabla === 'clientes' || tabla === 'cliente') {
            const rut = payload.rut ? String(payload.rut).trim() : null;
            const nombre = String(payload.nombre || 'Cliente').trim();
            const numId = Number(payload.id || registro_id || 0);

            if (operacion === 'DELETE') {
              const delRes = await client.query(
                `UPDATE clientes SET activo = FALSE 
                 WHERE (sqlite_id = $1 AND $1 > 0) OR (rut = $2 AND $2 IS NOT NULL)
                 RETURNING id`,
                [numId, rut]
              );
              pgResultId = delRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', note: 'Cliente desactivado (Soft Delete)' });
              okCount++;
            } else if (rut) {
              const clRes = await client.query(
                `INSERT INTO clientes (sqlite_id, rut, nombre, telefono, email, direccion, ciudad, limite_credito, saldo_deudor, activo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (rut) DO UPDATE SET
                   sqlite_id = EXCLUDED.sqlite_id,
                   nombre = EXCLUDED.nombre,
                   telefono = COALESCE(EXCLUDED.telefono, clientes.telefono),
                   email = COALESCE(EXCLUDED.email, clientes.email),
                   direccion = COALESCE(EXCLUDED.direccion, clientes.direccion),
                   ciudad = COALESCE(EXCLUDED.ciudad, clientes.ciudad),
                   limite_credito = EXCLUDED.limite_credito,
                   saldo_deudor = EXCLUDED.saldo_deudor,
                   activo = EXCLUDED.activo
                 RETURNING id`,
                [
                  numId,
                  rut,
                  nombre,
                  payload.telefono || null,
                  payload.email || null,
                  payload.direccion || null,
                  payload.ciudad || payload.comuna || null,
                  Number(payload.limiteCredito ?? payload.limiteFiado ?? payload.limite_credito ?? 0),
                  Number(payload.saldoDeudor ?? payload.saldoPendiente ?? payload.saldo_deudor ?? 0),
                  payload.activo !== false,
                ]
              );
              pgResultId = clRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', nombre, pg_id: pgResultId });
              okCount++;
            } else {
              const clRes = await client.query(
                `INSERT INTO clientes (sqlite_id, nombre, telefono, email, direccion, ciudad, limite_credito, saldo_deudor, activo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id`,
                [
                  numId,
                  nombre,
                  payload.telefono || null,
                  payload.email || null,
                  payload.direccion || null,
                  payload.ciudad || payload.comuna || null,
                  Number(payload.limiteCredito ?? payload.limiteFiado ?? payload.limite_credito ?? 0),
                  Number(payload.saldoDeudor ?? payload.saldoPendiente ?? payload.saldo_deudor ?? 0),
                  payload.activo !== false,
                ]
              );
              pgResultId = clRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', nombre, pg_id: pgResultId });
              okCount++;
            }
          }

          // 5. PROVEEDORES
          else if (tabla === 'proveedores' || tabla === 'proveedor') {
            const rut = payload.rut ? String(payload.rut).trim() : null;
            const nombre = String(payload.nombre || 'Proveedor').trim();
            const numId = Number(payload.id || registro_id || 0);

            if (operacion === 'DELETE') {
              const delRes = await client.query(
                `UPDATE proveedores SET activo = FALSE 
                 WHERE (sqlite_id = $1 AND $1 > 0) OR (rut = $2 AND $2 IS NOT NULL)
                 RETURNING id`,
                [numId, rut]
              );
              pgResultId = delRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', note: 'Proveedor desactivado (Soft Delete)' });
              okCount++;
            } else if (rut) {
              const prRes = await client.query(
                `INSERT INTO proveedores (sqlite_id, rut, nombre, contacto, telefono, email, direccion, activo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (rut) DO UPDATE SET
                   sqlite_id = EXCLUDED.sqlite_id,
                   nombre = EXCLUDED.nombre,
                   contacto = COALESCE(EXCLUDED.contacto, proveedores.contacto),
                   telefono = COALESCE(EXCLUDED.telefono, proveedores.telefono),
                   email = COALESCE(EXCLUDED.email, proveedores.email),
                   direccion = COALESCE(EXCLUDED.direccion, proveedores.direccion),
                   activo = EXCLUDED.activo
                 RETURNING id`,
                [
                  numId,
                  rut,
                  nombre,
                  payload.contacto || null,
                  payload.telefono || null,
                  payload.email || null,
                  payload.direccion || null,
                  payload.activo !== false,
                ]
              );
              pgResultId = prRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', nombre, pg_id: pgResultId });
              okCount++;
            } else {
              const prRes = await client.query(
                `INSERT INTO proveedores (sqlite_id, nombre, contacto, telefono, email, direccion, activo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  numId,
                  nombre,
                  payload.contacto || null,
                  payload.telefono || null,
                  payload.email || null,
                  payload.direccion || null,
                  payload.activo !== false,
                ]
              );
              pgResultId = prRes.rows[0]?.id;
              results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', nombre, pg_id: pgResultId });
              okCount++;
            }
          }

          // 6. CLIENTE MOVIMIENTOS (Abonos, Fiados)
          else if (tabla === 'cliente_movimientos') {
            let clientePgId = null;
            if (payload.cliente_id || payload.clienteId) {
              const cRes = await client.query('SELECT id FROM clientes WHERE sqlite_id = $1 OR id = $1 LIMIT 1', [Number(payload.cliente_id || payload.clienteId)]);
              if (cRes.rows.length > 0) clientePgId = cRes.rows[0].id;
            }

            if (clientePgId) {
              const movRes = await client.query(
                `INSERT INTO cliente_movimientos (
                  sqlite_id, cliente_id, tipo_movimiento, monto, saldo_resultante,
                  observacion, fecha, estado
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`,
                [
                  Number(payload.id || registro_id),
                  clientePgId,
                  payload.tipo_movimiento || payload.tipoMovimiento || 'ABONO',
                  Number(payload.monto || 0),
                  Number(payload.saldo_resultante ?? payload.saldoResultante ?? 0),
                  payload.observacion || null,
                  payload.fecha || new Date().toISOString(),
                  payload.estado || 'ACTIVO',
                ]
              );
              pgResultId = movRes.rows[0]?.id;
            }
            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', pg_id: pgResultId });
            okCount++;
          }

          // 7. COMPRAS
          else if (tabla === 'compras' || tabla === 'compra') {
            const folio = payload.folio ? Number(payload.folio) : null;
            const numeroFactura = payload.numeroFactura || payload.numero_factura || null;

            const insertCompra = await client.query(
              `INSERT INTO compras (
                sqlite_id, folio, numero_factura, proveedor_nombre, fecha,
                subtotal, impuesto_total, total, estado, usuario_nombre, notas
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING id`,
              [
                Number(payload.id || registro_id),
                folio,
                numeroFactura,
                payload.proveedorNombre || payload.proveedor_nombre || null,
                payload.fecha || new Date().toISOString(),
                Number(payload.subtotal || 0),
                Number(payload.impuestoTotal ?? payload.impuesto_total ?? 0),
                Number(payload.total || 0),
                payload.estado || 'completada',
                payload.usuarioNombre || payload.usuario_nombre || 'Admin',
                payload.notas || null,
              ]
            );

            pgResultId = insertCompra.rows[0].id;
            const items = payload.items || payload.compra_items || [];
            if (Array.isArray(items)) {
              for (const it of items) {
                await client.query(
                  `INSERT INTO compra_items (
                    sqlite_id, compra_id, codigo, nombre, cantidad, costo_unitario, subtotal
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    Number(it.id || 0),
                    pgResultId,
                    it.codigo || '',
                    it.nombre || 'Item compra',
                    Number(it.cantidad || 1),
                    Number(it.costoUnitario ?? it.costo_unitario ?? 0),
                    Number(it.subtotal || 0),
                  ]
                );
              }
            }

            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', pg_id: pgResultId });
            okCount++;
          }

          // 8. CAJA SESIONES & MOVIMIENTOS
          else if (tabla === 'caja_sesiones') {
            const csRes = await client.query(
              `INSERT INTO caja_sesiones (
                sqlite_id, usuario_id, usuario_nombre, fecha_apertura, monto_inicial,
                fecha_cierre, monto_esperado_efectivo, monto_real_efectivo, diferencia,
                total_ventas_efectivo, total_ventas_debito, total_ventas_credito,
                total_ventas_transferencia, total_ingresos_extra, total_egresos_extra,
                estado, observaciones
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              ON CONFLICT (sqlite_id) DO UPDATE SET
                fecha_cierre = EXCLUDED.fecha_cierre,
                monto_esperado_efectivo = EXCLUDED.monto_esperado_efectivo,
                monto_real_efectivo = EXCLUDED.monto_real_efectivo,
                diferencia = EXCLUDED.diferencia,
                total_ventas_efectivo = EXCLUDED.total_ventas_efectivo,
                total_ventas_debito = EXCLUDED.total_ventas_debito,
                total_ventas_credito = EXCLUDED.total_ventas_credito,
                total_ventas_transferencia = EXCLUDED.total_ventas_transferencia,
                total_ingresos_extra = EXCLUDED.total_ingresos_extra,
                total_egresos_extra = EXCLUDED.total_egresos_extra,
                estado = EXCLUDED.estado,
                observaciones = EXCLUDED.observaciones
              RETURNING id`,
              [
                Number(payload.id || registro_id),
                Number(payload.usuario_id || payload.usuarioId || 1),
                payload.usuario_nombre || payload.usuarioNombre || 'Cajero',
                payload.fecha_apertura || payload.fechaApertura || new Date().toISOString(),
                Number(payload.monto_inicial ?? payload.montoInicial ?? 0),
                payload.fecha_cierre || payload.fechaCierre || null,
                Number(payload.monto_esperado_efectivo ?? payload.montoEsperadoEfectivo ?? 0),
                Number(payload.monto_real_efectivo ?? payload.montoRealEfectivo ?? 0),
                Number(payload.diferencia || 0),
                Number(payload.total_ventas_efectivo ?? payload.totalVentasEfectivo ?? 0),
                Number(payload.total_ventas_debito ?? payload.totalVentasDebito ?? 0),
                Number(payload.total_ventas_credito ?? payload.totalVentasCredito ?? 0),
                Number(payload.total_ventas_transferencia ?? payload.totalVentasTransferencia ?? 0),
                Number(payload.total_ingresos_extra ?? payload.totalIngresosExtra ?? 0),
                Number(payload.total_egresos_extra ?? payload.totalEgresosExtra ?? 0),
                payload.estado || 'abierta',
                payload.observaciones || null,
              ]
            );
            pgResultId = csRes.rows[0]?.id;
            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', pg_id: pgResultId });
            okCount++;
          }

          else if (tabla === 'caja_movimientos') {
            const cmRes = await client.query(
              `INSERT INTO caja_movimientos (
                sqlite_id, tipo, monto, concepto, fecha, usuario_nombre
              ) VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id`,
              [
                Number(payload.id || registro_id),
                payload.tipo || 'ingreso',
                Number(payload.monto || 0),
                payload.concepto || 'Movimiento de caja',
                payload.fecha || new Date().toISOString(),
                payload.usuario_nombre || payload.usuarioNombre || 'Cajero',
              ]
            );
            pgResultId = cmRes.rows[0]?.id;
            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', pg_id: pgResultId });
            okCount++;
          }

          // 9. INVENTARIO MOVIMIENTOS (KARDEX)
          else if (tabla === 'inventario_movimientos') {
            let prodPgId = null;
            if (payload.producto_id || payload.productoId || payload.codigo) {
              const pRes = await client.query('SELECT id FROM productos WHERE sqlite_id = $1 OR codigo = $2 OR id = $1 LIMIT 1', [
                Number(payload.producto_id || payload.productoId || 0),
                payload.codigo || ''
              ]);
              if (pRes.rows.length > 0) prodPgId = pRes.rows[0].id;
            }

            const imRes = await client.query(
              `INSERT INTO inventario_movimientos (
                sqlite_id, producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, fecha
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING id`,
              [
                Number(payload.id || registro_id),
                prodPgId,
                payload.producto_nombre || payload.productoNombre || 'Producto',
                payload.tipo || 'ajuste',
                Number(payload.cantidad || 0),
                Number(payload.stock_anterior ?? payload.stockAnterior ?? 0),
                Number(payload.stock_nuevo ?? payload.stockNuevo ?? 0),
                payload.motivo || null,
                payload.referencia_id || payload.referenciaId ? Number(payload.referencia_id || payload.referenciaId) : null,
                payload.fecha || new Date().toISOString(),
              ]
            );
            pgResultId = imRes.rows[0]?.id;
            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', pg_id: pgResultId });
            okCount++;
          }

          // 10. CONFIGURACIÓN
          else if (tabla === 'configuracion') {
            if (payload.clave && payload.valor) {
              await client.query(
                `INSERT INTO configuracion (clave, valor, descripcion, actualizado_en)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                 ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP`,
                [payload.clave, String(payload.valor), payload.descripcion || null]
              );
            }
            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced' });
            okCount++;
          } else {
            results.push({ id, operation_id: operationId, tabla, registro_id, status: 'synced', note: 'Tabla reconocida' });
            okCount++;
          }

          // ===================================================================
          // Registrar operation_id completado para idempotencia técnica futura
          // ===================================================================
          await client.query(
            `INSERT INTO sync_processed_operations (operation_id, tabla, registro_id, operacion, resultado_pg_id, procesado_en)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT (operation_id) DO NOTHING`,
            [operationId, tabla, Number(registro_id || payload.id || 0), operacion, pgResultId || null]
          );

        } catch (opErr) {
          console.error(`[SyncPostgresService] Error procesando item ${id} (${tabla}):`, opErr.message);
          results.push({ id, operation_id: operationId, tabla, registro_id, status: 'error', error: opErr.message });
          failCount++;
        }
      }

      await client.query('COMMIT');

      // Registrar log de auditoría
      try {
        await query(
          `INSERT INTO sync_logs (total_items, procesados_ok, procesados_fallidos, detalles, ip_cliente)
           VALUES ($1, $2, $3, $4, $5)`,
          [items.length, okCount, failCount, JSON.stringify(results), clientIp]
        );
      } catch (logErr) {
        console.warn('[SyncPostgresService] Aviso guardando log:', logErr.message);
      }

      return {
        success: true,
        total: items.length,
        processedOk: okCount,
        processedFailed: failCount,
        results,
      };
    } catch (txErr) {
      await client.query('ROLLBACK');
      console.error('[SyncPostgresService] Error fatal en transacción de push:', txErr.message);
      throw txErr;
    } finally {
      client.release();
    }
  },

  /**
   * Obtiene catálogos maestros y datos desde PostgreSQL para inspección o consultas
   */
  async pullData() {
    const [categories, products, clients, providers, ventasRes, countsRes] = await Promise.all([
      query('SELECT * FROM categorias WHERE activo = TRUE ORDER BY nombre ASC'),
      query('SELECT * FROM productos WHERE activo = TRUE ORDER BY nombre ASC'),
      query('SELECT * FROM clientes WHERE activo = TRUE ORDER BY nombre ASC'),
      query('SELECT * FROM proveedores WHERE activo = TRUE ORDER BY nombre ASC'),
      query('SELECT * FROM ventas ORDER BY fecha DESC LIMIT 50'),
      query(`
        SELECT 
          (SELECT count(*) FROM productos) as productos,
          (SELECT count(*) FROM categorias) as categorias,
          (SELECT count(*) FROM clientes) as clientes,
          (SELECT count(*) FROM proveedores) as proveedores,
          (SELECT count(*) FROM ventas) as ventas,
          (SELECT count(*) FROM compras) as compras
      `),
    ]);

    return {
      success: true,
      counts: countsRes.rows[0] || {},
      data: {
        categories: categories.rows,
        products: products.rows,
        clients: clients.rows,
        providers: providers.rows,
        recentVentas: ventasRes.rows,
      },
      serverTime: new Date().toISOString(),
    };
  },

  /**
   * Estado y estadísticas de sincronización en PostgreSQL
   */
  async getStatus() {
    const status = getPostgresStatus();
    if (!status.isConnected) {
      return {
        online: false,
        database: 'postgresql',
        connected: false,
        error: status.lastError || 'Desconectado de PostgreSQL',
        serverTime: new Date().toISOString(),
      };
    }

    try {
      const statsRes = await query(`
        SELECT 
          (SELECT count(*) FROM productos) as productos_count,
          (SELECT count(*) FROM categorias) as categorias_count,
          (SELECT count(*) FROM clientes) as clientes_count,
          (SELECT count(*) FROM proveedores) as proveedores_count,
          (SELECT count(*) FROM ventas) as ventas_count,
          (SELECT count(*) FROM compras) as compras_count,
          (SELECT count(*) FROM caja_sesiones) as caja_sesiones_count,
          (SELECT MAX(creado_en) FROM sync_logs) as ultima_sincronizacion
      `);

      return {
        online: true,
        database: 'postgresql',
        connected: true,
        counts: statsRes.rows[0],
        lastSyncedAt: statsRes.rows[0]?.ultima_sincronizacion || null,
        serverTime: new Date().toISOString(),
      };
    } catch (e) {
      return {
        online: true,
        database: 'postgresql',
        connected: false,
        error: e.message,
        serverTime: new Date().toISOString(),
      };
    }
  },
};

export default syncPostgresService;
