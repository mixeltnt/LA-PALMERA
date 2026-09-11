import mongoose from 'mongoose';

async function checkOrphans() {
  await mongoose.connect('mongodb://localhost:27017/lapalmera');
  const db = mongoose.connection.db;

  const compras = await db.collection('compras').find({}).toArray();
  const compraIds = new Set(compras.map(c => c._id.toString()));

  const detalles = await db.collection('detallecompras').find({}).toArray();
  for (const d of detalles) {
    const parentId = d.compra.toString();
    const parentExists = compraIds.has(parentId);
    console.log(`Detalle ${d._id} -> Compra parent: ${parentId}, Parent Exists: ${parentExists}`);
  }

  await mongoose.disconnect();
}

checkOrphans().catch(console.error);
