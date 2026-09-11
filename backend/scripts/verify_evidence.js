import mongoose from 'mongoose';
import sqlite3 from 'sqlite3';

const MONGODB_URI = 'mongodb://localhost:27017/lapalmera_db';

async function verifyAll() {
  await mongoose.connect(MONGODB_URI);
  const dbMongo = mongoose.connection.db;

  // 1. Check MongoDB Venta 58
  const ventasMongo = await dbMongo.collection('ventas').find({ numeroVenta: 58 }).toArray();
  const allVentasMongoCount = await dbMongo.collection('ventas').countDocuments();
  const prodMongo = await dbMongo.collection('products').findOne({ codigo: 'TEST-PAN-040' });

  console.log("=== EVIDENCIA MONGODB ===");
  console.log("Total Ventas en Mongo:", allVentasMongoCount);
  console.log("Ventas con Folio 58 en Mongo (debe ser 1):", ventasMongo.length);
  if (ventasMongo.length > 0) {
    const v = ventasMongo[0];
    console.log("Venta #58 Mongo:", {
      _id: v._id.toString(),
      numeroVenta: v.numeroVenta,
      estado: v.estado,
      total: v.total,
      metodoPago: v.metodoPago,
      fecha: v.fecha
    });
  }
  console.log("Producto Pan Hallulla en Mongo:", {
    codigo: prodMongo.codigo,
    nombre: prodMongo.nombre,
    stockActual: prodMongo.stockActual
  });

  // 2. Check SQLite
  const dbSqlite = new sqlite3.Database('C:\\LaPalmera\\database\\lapalmera.db');
  dbSqlite.all("SELECT id, folio, numero_boleta, total, monto_recibido, vuelto, metodo_pago_principal, estado, fecha FROM ventas WHERE folio = 58", (err, rows) => {
    console.log("\n=== EVIDENCIA SQLITE ===");
    console.log("Venta Folio 58 en SQLite:", rows);

    dbSqlite.all("SELECT id, codigo, nombre, stock_actual FROM productos WHERE id = 43", (err2, prodRows) => {
      console.log("Producto en SQLite despues de venta:", prodRows);

      dbSqlite.all("SELECT id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo FROM inventario_movimientos WHERE referencia_id = 51", (err3, kardexRows) => {
        console.log("Movimiento Kardex asociado:", kardexRows);

        dbSqlite.all("SELECT COUNT(*) as pendientes FROM sync_queue WHERE estado = 'pendiente'", (err4, qRows) => {
          console.log("Sync Queue pendientes:", qRows[0].pendientes);

          dbSqlite.all("SELECT id, tabla, registro_id, operacion, estado, sincronizado_en FROM sync_queue WHERE id = 4", (err5, itemRows) => {
            console.log("Detalle operacion en sync_queue:", itemRows);
            dbSqlite.close();
            mongoose.disconnect();
          });
        });
      });
    });
  });
}

verifyAll();
