import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";

function validar(data) {
  const errores = [];

  if (!data.nombre || data.nombre.trim() === "") {
    errores.push("El nombre de la categoría es obligatorio.");
  }

  return errores;
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.nombre = regex;
  }

  if (filtros.activo === "true") query.activo = true;
  if (filtros.activo === "false") query.activo = false;

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [categorias, total] = await Promise.all([
    Category.find(query).sort({ nombre: 1 }).skip(skip).limit(limit),
    Category.countDocuments(query),
  ]);

  return {
    categorias,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listarTodas() {
  return await Category.find({ activo: true }).sort({ nombre: 1 });
}

export async function obtenerPorId(id) {
  const categoria = await Category.findById(id);
  if (!categoria) throw new Error("Categoría no encontrada.");
  return categoria;
}

export async function crear(data) {
  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const nombreTrim = data.nombre.trim();
  const existe = await Category.findOne({ nombre: { $regex: new RegExp(`^${nombreTrim}$`, "i") } });
  if (existe) {
    const err = new Error("Ya existe una categoría con ese nombre.");
    err.errores = ["Ya existe una categoría con ese nombre."];
    err.status = 400;
    throw err;
  }

  const categoria = new Category({
    nombre: nombreTrim,
    descripcion: data.descripcion || "",
    activo: data.activo !== undefined ? data.activo : true,
  });

  return await categoria.save();
}

export async function actualizar(id, data) {
  const categoria = await Category.findById(id);
  if (!categoria) throw new Error("Categoría no encontrada.");

  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const nombreTrim = data.nombre.trim();
  if (nombreTrim.toLowerCase() !== categoria.nombre.toLowerCase()) {
    const existe = await Category.findOne({
      nombre: { $regex: new RegExp(`^${nombreTrim}$`, "i") },
      _id: { $ne: id },
    });
    if (existe) {
      const err = new Error("Ya existe otra categoría con ese nombre.");
      err.errores = ["Ya existe otra categoría con ese nombre."];
      err.status = 400;
      throw err;
    }
  }

  Object.assign(categoria, {
    nombre: nombreTrim,
    descripcion: data.descripcion ?? categoria.descripcion,
    activo: data.activo !== undefined ? data.activo : categoria.activo,
  });

  return await categoria.save();
}

export async function eliminar(id) {
  const categoria = await Category.findById(id);
  if (!categoria) throw new Error("Categoría no encontrada.");

  const productosAsociados = await Product.countDocuments({ categoria: categoria.nombre });
  if (productosAsociados > 0) {
    const err = new Error(`No se puede eliminar la categoría porque tiene ${productosAsociados} producto(s) asociado(s).`);
    err.errores = [`La categoría "${categoria.nombre}" tiene ${productosAsociados} producto(s) asociado(s). Desasocia o elimina los productos primero.`];
    err.status = 400;
    throw err;
  }

  await Category.findByIdAndDelete(id);
  return categoria;
}

export async function obtenerStats() {
  const total = await Category.countDocuments();
  const activas = await Category.countDocuments({ activo: true });
  return { total, activas };
}
