import mongoose from "mongoose";

export async function conectarDB() {
  try {
    console.log("================================");
    console.log("URI usada:");
    console.log(process.env.MONGODB_URI);
    console.log("================================");

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error al conectar MongoDB:");
    console.error(error);
    process.exit(1);
  }
}
