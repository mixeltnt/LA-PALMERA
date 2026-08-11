import mongoose from "mongoose";

const movimientoCuentaSchema = new mongoose.Schema(
  {
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    tipoMovimiento: {
      type: String,
      required: true,
      enum: ["VENTA_FIADA", "ABONO", "REVERSO_ABONO"],
    },
    venta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venta",
      default: null,
    },
    monto: { type: Number, required: true, min: 0 },
    fecha: { type: Date, required: true, default: Date.now },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    observacion: { type: String, default: "", trim: true },
    estado: {
      type: String,
      enum: ["ACTIVO", "ANULADO"],
      default: "ACTIVO",
    },
  },
  { timestamps: true },
);

const MovimientoCuenta = mongoose.model(
  "MovimientoCuenta",
  movimientoCuentaSchema,
);

export default MovimientoCuenta;
