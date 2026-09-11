import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/lapalmera';

async function verifyMongo() {
  await mongoose.connect(MONGODB_URI);
  const dbMongo = mongoose.connection.db;

  const ventasMongo = await dbMongo.collection('ventas').find({ numeroVenta: 58 }).toArray();
  const allVentasMongoCount = await dbMongo.collection('ventas').countDocuments();
  const prodMongo = await dbMongo.collection('products').findOne({ codigo: 'TEST-PAN-040' });
  const detallesVenta58 = ventasMongo.length > 0 ? await dbMongo.collection('detalleventas').find({ venta: ventasMongo[0]._id }).toArray() : [];

  console.log("=== EVIDENCIA MONGODB ===");
  console.log("Total Ventas en Mongo:", allVentasMongoCount);
  console.log("Cantidad de Ventas con Folio 58 en Mongo (debe ser 1):", ventasMongo.length);
  if (ventasMongo.length > 0) {
    const v = ventasMongo[0];
    console.log("Venta Folio 58 Doc:", {
      _id: v._id.toString(),
      numeroVenta: v.numeroVenta,
      estado: v.estado,
      total: v.total,
      subtotal: v.subtotal,
      metodoPago: v.metodoPago,
      fecha: v.fecha
    });
  }
  console.log("Detalles de Venta 58 en Mongo:", detallesVenta58);
  console.log("Stock de Pan Hallulla (TEST-PAN-040) en Mongo:", prodMongo ? prodMongo.stockActual : 'N/A');

  await mongoose.disconnect();
}

verifyMongo();
