import mongoose from "mongoose";

const detalleCompraSchema = new mongoose.Schema(
  {
    compra: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Compra",
      required: true,
    },
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    cantidad: { type: Number, required: true, min: 1 },
    precioCompra: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

const DetalleCompra = mongoose.model("DetalleCompra", detalleCompraSchema);
export default DetalleCompra;
