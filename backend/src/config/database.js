import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB conectado");
  } catch {
    console.error("✗ Error conectando a MongoDB");
    process.exit(1);
  }
}
