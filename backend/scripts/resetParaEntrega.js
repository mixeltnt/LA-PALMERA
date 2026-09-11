import "dotenv/config";
import { query, getPostgresPool } from "../src/config/postgres.js";
import { seedUsuariosPostgresIfEmpty } from "../src/controllers/authController.js";

async function limpiarBaseDatosParaEntrega() {
  console.log("==========================================================");
  console.log("🧹 LA PALMERA POS v23 - LIMPIEZA TOTAL PARA ENTREGA");
  console.log("==========================================================");
  console.log("📡 Conectando a PostgreSQL Neon Cloud...");

  try {
    // 1. Limpiar tablas transaccionales de prueba
    console.log("⏳ Vaciando ventas, turnos de caja, compras y movimientos de prueba...");
    await query(`
      TRUNCATE TABLE 
        ventas, 
        venta_items, 
        venta_pagos, 
        caja_sesiones, 
        caja_movimientos, 
        cliente_movimientos, 
        compras, 
        compra_items, 
        inventario_movimientos,
        sync_processed_operations, 
        sync_logs 
      CASCADE;
    `);

    // 2. Reiniciar secuencias de IDs a 1
    console.log("⏳ Reiniciando secuencias y contadores a cero...");
    const secuencias = [
      "ventas_id_seq",
      "venta_items_id_seq",
      "venta_pagos_id_seq",
      "caja_sesiones_id_seq",
      "caja_movimientos_id_seq",
      "cliente_movimientos_id_seq",
      "compras_id_seq",
      "compra_items_id_seq",
      "inventario_movimientos_id_seq",
      "sync_logs_id_seq"
    ];

    for (const seq of secuencias) {
      try {
        await query(`ALTER SEQUENCE ${seq} RESTART WITH 1;`);
      } catch {
        // Ignorar si la secuencia usa otro nombre
      }
    }

    // 3. Reiniciar deudas de clientes a $0
    await query(`UPDATE clientes SET saldo_deudor = 0 WHERE saldo_deudor > 0;`);

    // 4. Asegurar usuarios maestros (yasna, karla, vendedor)
    console.log("⏳ Verificando cuentas de usuario maestras...");
    await seedUsuariosPostgresIfEmpty();

    console.log("==========================================================");
    console.log("✅ ¡LIMPIEZA EXITOSA DE LA NUBE!");
    console.log("📊 Estado actual de la base de datos en Neon:");
    console.log("   • Ventas registradas:       0 (Folios en blanco)");
    console.log("   • Turnos de caja activos:   0");
    console.log("   • Cola de sincronización:   0 operaciones");
    console.log("   • Cuentas de usuario:       Listas (yasna / karla / vendedor)");
    console.log("==========================================================");
  } catch (error) {
    console.error("❌ Error durante la limpieza:", error.message);
  } finally {
    const pool = getPostgresPool();
    if (pool) await pool.end();
  }
}

limpiarBaseDatosParaEntrega();
