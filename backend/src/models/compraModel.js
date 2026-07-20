import mongoose from "mongoose";

const compraSchema = new mongoose.Schema(
  {
    proveedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    fechaCompra: { type: Date, required: true, default: Date.now },
    numeroDocumento: { type: String, required: true, trim: true },
    observaciones: { type: String, default: "", trim: true },
    estado: {
      type: String,
      enum: ["BORRADOR", "CONFIRMADA"],
      default: "BORRADOR",
    },
    total: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

const Compra = mongoose.model("Compra", compraSchema);
export default Compra;
