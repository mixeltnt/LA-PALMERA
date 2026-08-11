import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    rut: { type: String, required: true, trim: true },
    telefono: { type: String, default: "" },
    email: { type: String, default: "", trim: true },
    direccion: { type: String, default: "" },
    comuna: { type: String, default: "" },
    observaciones: { type: String, default: "" },
    limiteFiado: { type: Number, default: 0, min: 0 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);
export default Client;
