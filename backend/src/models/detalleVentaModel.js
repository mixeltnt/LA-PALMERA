import mongoose from "mongoose";

const detalleVentaSchema = new mongoose.Schema(
  {
    venta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venta",
      required: true,
    },
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
    descuento: { type: Number, required: true, min: 0, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

const DetalleVenta = mongoose.model("DetalleVenta", detalleVentaSchema);
export default DetalleVenta;
