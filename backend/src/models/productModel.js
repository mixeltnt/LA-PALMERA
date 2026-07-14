import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    nombre: { type: String, required: true },
    categoria: { type: String, required: true },
    marca: { type: String },
    precioCompra: { type: Number, default: 0 },
    precioVenta: { type: Number, required: true },
    stock: { type: Number, required: true },
    stockMinimo: { type: Number, default: 0 },
    proveedor: { type: String },
    codigoBarras: { type: String },
    estado: { type: String, default: "Activo" },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", productSchema);
export default Product;
