import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, trim: true, unique: true },
    codigoBarras: { type: String, trim: true, unique: true, sparse: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    marca: { type: String, default: "" },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    proveedorPrincipal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      default: null,
    },
    precioCompra: { type: Number, default: 0 },
    precioVenta: { type: Number, required: true },
    stockActual: { type: Number, required: true, default: 0 },
    stockMinimo: { type: Number, default: 0 },
    unidadMedida: { type: String, default: "Unidad" },
    imagen: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);
export default Product;
