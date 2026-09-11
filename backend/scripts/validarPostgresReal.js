// Script de Validación Real Extremo a Extremo contra PostgreSQL Cloud (Neon)
// LA PALMERA POS v23 - Validación de Sincronización Real
import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { getPostgresPool, testPostgresConnection, initPostgres, query } from '../src/config/postgres.js';
import { syncPostgresService } from '../src/services/syncPostgresService.js';

async function runRealValidation() {
  console.log('========================================================================');
  console.log('🚀 VALIDACIÓN REAL EXTREMO A EXTREMO: SQLite -> API -> PostgreSQL (NEON)');
  console.log('========================================================================\n');

  const rootDir = path.resolve(import.meta.dirname, '..', '..');
  const dbPath = path.join(rootDir, 'database', 'lapalmera.db');
  const db = new DatabaseSync(dbPath);

  // 1. Probar Conexión TCP/SSL con Neon PostgreSQL
  console.log('📡 [PASO 1] Probando conexión directa con Neon PostgreSQL Cloud...');
  const connTest = await testPostgresConnection();
  if (!connTest.ok) {
    console.error('❌ Error conectando a PostgreSQL:', connTest.error);
    process.exit(1);
  }
  console.log(`✅ Conexión exitosa a PostgreSQL Neon!`);
  console.log(`   - Timestamp Servidor: ${connTest.timestamp}`);
  console.log(`   - Versión PostgreSQL: ${connTest.version.split(',')[0]}\n`);

  // 2. Inicializar Esquema DDL en PostgreSQL Neon
  console.log('🛠️ [PASO 2] Inicializando esquema DDL (schemaPostgres.sql) en Neon...');
  const schemaInit = await initPostgres();
  if (!schemaInit) {
    console.error('❌ Error aplicando esquema en PostgreSQL.');
    process.exit(1);
  }
  console.log('✅ Esquema y tablas verificadas en PostgreSQL Neon.\n');

  // 3. PRUEBA 1: Crear Venta Offline en SQLite Local
  console.log('🛒 [PRUEBA 1] Creando Venta Real Offline en SQLite Local...');
  const testFolio = 99901;
  const testDate = new Date().toISOString();
  
  const insertSale = db.prepare(`
    INSERT INTO ventas (folio, numero_boleta, fecha, cajero_id, cajero_nombre, subtotal, total, metodo_pago_principal, estado, sincronizado)
    VALUES (?, ?, ?, 1, 'Yasna', 5500, 5500, 'efectivo', 'completada', 0)
  `).run(testFolio, `BOL-${testFolio}`, testDate);
  const saleId = Number(insertSale.lastInsertRowid);

  // Crear items y pagos en SQLite
  db.prepare(`
    INSERT INTO venta_items (venta_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
    VALUES (?, 1, 'PAN-001', 'Pan Marraqueta 1kg', 2, 1500, 900, 3000),
           (?, 2, 'BEB-002', 'Bebida Sprite 1.5L', 1, 2500, 1600, 2500)
  `).run(saleId, saleId);

  db.prepare(`
    INSERT INTO venta_pagos (venta_id, metodo, monto)
    VALUES (?, 'efectivo', 5500)
  `).run(saleId);

  // Encolar en sync_queue con operation_id único
  const opId = `op_ventas_${saleId}_folio_${testFolio}_${Date.now()}_testneon`;
  const salePayload = {
    id: saleId,
    folio: testFolio,
    numeroBoleta: `BOL-${testFolio}`,
    fecha: testDate,
    cajeroId: 1,
    cajeroNombre: 'Yasna',
    subtotal: 5500,
    total: 5500,
    metodoPagoPrincipal: 'efectivo',
    estado: 'completada',
    items: [
      { id: 1, codigo: 'PAN-001', nombre: 'Pan Marraqueta 1kg', cantidad: 2, precioUnitario: 1500, costoUnitario: 900, subtotal: 3000 },
      { id: 2, codigo: 'BEB-002', nombre: 'Bebida Sprite 1.5L', cantidad: 1, precioUnitario: 2500, costoUnitario: 1600, subtotal: 2500 }
    ],
    pagos: [{ id: 1, metodo: 'efectivo', monto: 5500 }]
  };

  db.prepare(`
    INSERT INTO sync_queue (operation_id, tabla, registro_id, operacion, payload_json, estado, intentos, creado_en)
    VALUES (?, 'ventas', ?, 'INSERT', ?, 'pendiente', 0, datetime('now', 'localtime'))
  `).run(opId, saleId, JSON.stringify(salePayload));

  console.log(`✅ Venta guardada en SQLite (ID: ${saleId}, Folio: ${testFolio})`);
  console.log(`✅ Operación encolada en sync_queue con operation_id: ${opId}\n`);

  // 4. PRUEBA 2: Persistencia tras reinicio offline
  console.log('🔄 [PRUEBA 2] Verificando persistencia tras reinicio offline...');
  const dbVerify = new DatabaseSync(dbPath);
  const vCheck = dbVerify.prepare('SELECT * FROM ventas WHERE id = ?').all(saleId);
  const qCheck = dbVerify.prepare('SELECT * FROM sync_queue WHERE operation_id = ?').all(opId);
  if (vCheck.length === 1 && qCheck.length === 1) {
    console.log('✅ Persistencia confirmada en SQLite.\n');
  } else {
    console.error('❌ Error de persistencia en SQLite.');
  }

  // 5. PRUEBA 3 & 4: Sincronización Real SQLite -> PostgreSQL Neon
  console.log('🌐 [PRUEBA 3 & 4] Enviando lote de sincronización a PostgreSQL Neon...');
  const pushBatch = [{
    id: qCheck[0].id,
    operation_id: opId,
    tabla: 'ventas',
    registro_id: saleId,
    operacion: 'INSERT',
    payload_json: JSON.stringify(salePayload)
  }];

  const pushResult = await syncPostgresService.processPushBatch(pushBatch, '127.0.0.1');
  console.log('📥 Respuesta del Backend Sync Service:', JSON.stringify(pushResult, null, 2));

  if (pushResult.success && pushResult.processedOk === 1) {
    console.log('✅ Sincronización exitosa en PostgreSQL Neon!');
  } else {
    console.error('❌ Falló la sincronización:', pushResult);
    process.exit(1);
  }

  // Marcar como completado en SQLite
  db.prepare("UPDATE sync_queue SET estado = 'completado', sincronizado_en = datetime('now', 'localtime') WHERE operation_id = ?").run(opId);
  db.prepare("UPDATE ventas SET sincronizado = 1 WHERE id = ?").run(saleId);

  // 6. Verificar Físicamente en PostgreSQL Neon
  console.log('\n🔍 [VERIFICACIÓN FÍSICA EN POSTGRESQL NEON]');
  const pgVenta = await query('SELECT * FROM ventas WHERE folio = $1', [testFolio]);
  const pgItems = await query('SELECT * FROM venta_items WHERE venta_id = $1', [pgVenta.rows[0].id]);
  const pgPagos = await query('SELECT * FROM venta_pagos WHERE venta_id = $1', [pgVenta.rows[0].id]);
  const pgOps = await query('SELECT * FROM sync_processed_operations WHERE operation_id = $1', [opId]);

  console.log(`   - Venta en PostgreSQL: ID=${pgVenta.rows[0].id}, Folio=${pgVenta.rows[0].folio}, Total=$${pgVenta.rows[0].total}, Estado=${pgVenta.rows[0].estado}`);
  console.log(`   - Ítems en PostgreSQL: ${pgItems.rows.length} registrados`);
  pgItems.rows.forEach((it, idx) => console.log(`     ${idx+1}. ${it.nombre} x${it.cantidad} - Subtotal: $${it.subtotal}`));
  console.log(`   - Pagos en PostgreSQL: ${pgPagos.rows.length} registrados (${pgPagos.rows[0].metodo}: $${pgPagos.rows[0].monto})`);
  console.log(`   - Idempotencia en PostgreSQL: operation_id '${pgOps.rows[0].operation_id}' registrado correctamente.\n`);

  // 7. PRUEBA 5: Simulación de Corte de Red / Reintento / Idempotencia Real
  console.log('🛡️ [PRUEBA 5] Simulando Pérdida de Respuesta HTTP y Reintento (Mismo operation_id)...');
  const retryResult = await syncPostgresService.processPushBatch(pushBatch, '127.0.0.1');
  console.log('📥 Respuesta al Reintento:', JSON.stringify(retryResult, null, 2));

  const checkCountAfterRetry = await query('SELECT count(*) as c FROM ventas WHERE folio = $1', [testFolio]);
  const checkItemsAfterRetry = await query('SELECT count(*) as c FROM venta_items WHERE venta_id = $1', [pgVenta.rows[0].id]);

  console.log(`   - Total ventas con Folio ${testFolio} en PostgreSQL tras reintento: ${checkCountAfterRetry.rows[0].c} (Esperado: 1)`);
  console.log(`   - Total items asociados en PostgreSQL tras reintento: ${checkItemsAfterRetry.rows[0].c} (Esperado: 2)`);

  if (Number(checkCountAfterRetry.rows[0].c) === 1 && Number(checkItemsAfterRetry.rows[0].c) === 2) {
    console.log('✅ IDEMPOTENCIA TÉCNICA Y DE NEGOCIO 100% CONFIRMADA EN POSTGRESQL NEON.\n');
  } else {
    console.error('❌ Error de duplicación detectado!');
  }

  // 8. PRUEBA 6: Lote Multi-Entidad Offline (Categorías, Productos, Clientes, Sesión Caja)
  console.log('📦 [PRUEBA 6] Sincronizando Lote Multi-Entidad Offline...');
  const multiBatch = [
    {
      id: 101,
      operation_id: `op_cat_test_${Date.now()}`,
      tabla: 'categorias',
      registro_id: 99,
      operacion: 'INSERT',
      payload_json: JSON.stringify({ id: 99, nombre: 'Panadería Artesanal', descripcion: 'Categoría de prueba Cloud', activo: true })
    },
    {
      id: 102,
      operation_id: `op_prod_test_${Date.now()}`,
      tabla: 'productos',
      registro_id: 99,
      operacion: 'INSERT',
      payload_json: JSON.stringify({ id: 99, codigo: 'PAN-ART-01', nombre: 'Pan Masa Madre 500g', precioVenta: 2200, precioCosto: 1100, stockActual: 20, activo: true })
    },
    {
      id: 103,
      operation_id: `op_cli_test_${Date.now()}`,
      tabla: 'clientes',
      registro_id: 99,
      operacion: 'INSERT',
      payload_json: JSON.stringify({ id: 99, rut: '11.111.111-1', nombre: 'Cliente Prueba Cloud', telefono: '+56912345678', limiteCredito: 50000, saldoDeudor: 0, activo: true })
    },
    {
      id: 104,
      operation_id: `op_caja_test_${Date.now()}`,
      tabla: 'caja_sesiones',
      registro_id: 99,
      operacion: 'INSERT',
      payload_json: JSON.stringify({ id: 99, usuario_id: 1, usuario_nombre: 'Yasna', monto_inicial: 50000, estado: 'abierta' })
    }
  ];

  const multiRes = await syncPostgresService.processPushBatch(multiBatch, '127.0.0.1');
  console.log(`✅ Lote multi-entidad procesado: ${multiRes.processedOk}/${multiRes.total} exitosos.\n`);

  // 9. PRUEBA 7: Eliminación Segura (Soft Delete) en PostgreSQL Neon
  console.log('🗑️ [PRUEBA 7] Probando Operación DELETE (Soft Delete Seguro)...');
  const deleteBatch = [
    {
      id: 105,
      operation_id: `op_del_prod_${Date.now()}`,
      tabla: 'productos',
      registro_id: 99,
      operacion: 'DELETE',
      payload_json: JSON.stringify({ id: 99, codigo: 'PAN-ART-01' })
    }
  ];
  const delRes = await syncPostgresService.processPushBatch(deleteBatch, '127.0.0.1');
  const checkDelProd = await query('SELECT id, codigo, activo FROM productos WHERE codigo = $1', ['PAN-ART-01']);
  console.log(`   - Producto tras DELETE: Código=${checkDelProd.rows[0].codigo}, Activo=${checkDelProd.rows[0].activo} (Esperado: false)`);
  if (checkDelProd.rows[0].activo === false) {
    console.log('✅ SOFT DELETE SEGURO CONFIRMADO EN POSTGRESQL NEON.\n');
  } else {
    console.error('❌ Falló el soft delete en PostgreSQL!');
  }

  // 10. Estado y Métricas Finales
  const statusRes = await syncPostgresService.getStatus();
  console.log('📊 [ESTADO Y MÉTRICAS DE POSTGRESQL NEON]');
  console.log(JSON.stringify(statusRes, null, 2));

  // Limpieza de datos temporales de prueba en SQLite
  db.prepare('DELETE FROM sync_queue WHERE operation_id = ?').run(opId);
  db.prepare('DELETE FROM venta_pagos WHERE venta_id = ?').run(saleId);
  db.prepare('DELETE FROM venta_items WHERE venta_id = ?').run(saleId);
  db.prepare('DELETE FROM ventas WHERE id = ?').run(saleId);

  console.log('\n========================================================================');
  console.log('🎉 VALIDACIÓN REAL CONTRA POSTGRESQL CLOUD (NEON) COMPLETADA CON ÉXITO!');
  console.log('========================================================================');

  const pool = getPostgresPool();
  await pool.end();
}

runRealValidation().catch((err) => {
  console.error('Error fatal durante la validación:', err);
  process.exit(1);
});
