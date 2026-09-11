import "dotenv/config";
import mongoose from "mongoose";

async function resetMongo() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/lapalmera";
  console.log(`Conectando a MongoDB: ${uri}`);
  await mongoose.connect(uri);

  const collections = await mongoose.connection.db.collections();
  console.log(`Colecciones encontradas: ${collections.length}`);

  for (const coll of collections) {
    const name = coll.collectionName;
    const res = await coll.deleteMany({});
    console.log(`🧹 Colección '${name}': ${res.deletedCount} documentos eliminados.`);
  }

  console.log("✅ Base de datos MongoDB limpia en 0.");
  await mongoose.disconnect();
}

resetMongo().catch((err) => {
  console.error("Error reseteando MongoDB:", err);
  process.exit(1);
});
