import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    descripcion: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
