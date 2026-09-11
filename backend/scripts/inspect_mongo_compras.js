import mongoose from 'mongoose';

async function inspectMongo() {
  await mongoose.connect('mongodb://localhost:27017/lapalmera');
  console.log('Connected to MongoDB lapalmera');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`Collection ${c.name}: ${count} documents`);
  }

  console.log('\n--- COMPRAS IN MONGODB ---');
  const compras = await db.collection('compras').find({}).toArray();
  console.log(JSON.stringify(compras, null, 2));

  console.log('\n--- COMPRA_ITEMS / COMPRAS_ITEMS IN MONGODB ---');
  for (const colName of ['compra_items', 'compras_items', 'compraitems', 'comprasitems']) {
    if (collections.find(c => c.name === colName)) {
      const items = await db.collection(colName).find({}).toArray();
      console.log(`Collection ${colName} (${items.length}):`, JSON.stringify(items, null, 2));
    }
  }

  // Also check if compras have embedded items
  console.log('\n--- CHECKING PRODUCTS IN MONGODB & SQLITE ---');
  const prods = await db.collection('productos').find({}).toArray();
  console.log(`MongoDB productos count: ${prods.length}`);

  await mongoose.disconnect();
}

inspectMongo().catch(err => console.error('Mongo error:', err));
