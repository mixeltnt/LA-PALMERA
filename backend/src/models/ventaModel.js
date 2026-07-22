import mongoose from "mongoose";

const secuenciaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true },
    valorActual: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Secuencia =
  mongoose.models.Secuencia || mongoose.model("Secuencia", secuenciaSchema);

const ventaSchema = new mongoose.Schema(
  {
    numeroVenta: { type: Number, required: true, unique: true },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fecha: { type: Date, required: true, default: Date.now },
    estado: {
      type: String,
      enum: ["BORRADOR", "CONFIRMADA", "ANULADA"],
      default: "BORRADOR",
    },
    subtotal: { type: Number, required: true, default: 0 },
    descuento: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    metodoPago: {
      type: String,
      required: true,
      trim: true,
      enum: ["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA", "CAJA_VECINA"],
    },
    observaciones: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

ventaSchema.pre("validate", async function (next) {
  try {
    if (this.isNew && (this.numeroVenta == null || this.numeroVenta === 0)) {
      const secuencia = await Secuencia.findOneAndUpdate(
        { nombre: "venta" },
        { $inc: { valorActual: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      this.numeroVenta = secuencia.valorActual;
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Venta = mongoose.model("Venta", ventaSchema);
export default Venta;
