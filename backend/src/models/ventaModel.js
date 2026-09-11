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
      enum: [
        "EFECTIVO",
        "DEBITO",
        "CREDITO",
        "TRANSFERENCIA",
        "CAJA_VECINA",
        "FIADO",
      ],
    },
    observaciones: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

ventaSchema.pre("validate", async function () {
  if (this.isNew && (this.numeroVenta == null || this.numeroVenta === 0)) {
    const maxVenta = await mongoose
      .model("Venta")
      .findOne({})
      .sort({ numeroVenta: -1 })
      .select("numeroVenta")
      .lean();
    const maxExistente = Number(maxVenta?.numeroVenta || 0);

    const seq = await Secuencia.findOne({ nombre: "venta" });
    const nextVal = Math.max(Number(seq?.valorActual || 0), maxExistente) + 1;

    const secuencia = await Secuencia.findOneAndUpdate(
      { nombre: "venta" },
      { $set: { valorActual: nextVal } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    this.numeroVenta = secuencia.valorActual;
  }
});

const Venta = mongoose.model("Venta", ventaSchema);
export default Venta;
