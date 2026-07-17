import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    categoria: { type: String, default: "" },
    codigoBarras: { type: String, default: "" },
    precioCompra: { type: Number, default: 0 },
    precioVenta: { type: Number, required: true },
    stock: { type: Number, required: true },
    stockMinimo: { type: Number, default: 0 },
    unidadMedida: { type: String, default: "Unidad" },
    marca: { type: String, default: "" },
    imagen: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
