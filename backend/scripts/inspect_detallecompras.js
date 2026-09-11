import mongoose from 'mongoose';


async function inspectDetails() {
  await mongoose.connect('mongodb://localhost:27017/lapalmera');
  const db = mongoose.connection.db;

  console.log('--- DETALLECOMPRAS IN MONGODB ---');
  const detalle = await db.collection('detallecompras').find({}).toArray();
  console.log(JSON.stringify(detalle, null, 2));

  console.log('\n--- PROVIDERS IN MONGODB ---');
  const providers = await db.collection('providers').find({}).toArray();
  console.log(JSON.stringify(providers, null, 2));

  console.log('\n--- PRODUCTS REFERENCED IN DETALLECOMPRAS ---');
  for (const d of detalle) {
    const p = await db.collection('products').findOne({ _id: d.producto });
    console.log(`Detalle ${d._id} -> Producto Mongo:`, p ? { id: p._id, codigo: p.codigo, nombre: p.nombre, precioCompra: p.precioCompra, stock: p.stock } : 'NOT FOUND');
  }

  await mongoose.disconnect();
}

inspectDetails().catch(console.error);
