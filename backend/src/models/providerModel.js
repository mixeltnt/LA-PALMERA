import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    rut: { type: String, default: "", trim: true },
    contacto: { type: String, default: "", trim: true },
    telefono: { type: String, default: "", trim: true },
    correo: { type: String, default: "", trim: true },
    direccion: { type: String, default: "", trim: true },
    ciudad: { type: String, default: "", trim: true },
    observaciones: { type: String, default: "", trim: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Provider = mongoose.model("Provider", providerSchema);
export default Provider;
