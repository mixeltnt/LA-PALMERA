import Product from "../models/productModel.js";

function validar(data) {
  const errores = [];

  if (!data.codigo || data.codigo.trim() === "") {
    errores.push("El código del producto es obligatorio.");
  }

  if (!data.nombre || data.nombre.trim() === "") {
    errores.push("El nombre del producto es obligatorio.");
  }

  const precioCompra = Number(data.precioCompra);
  if (data.precioCompra != null && data.precioCompra !== "" && precioCompra <= 0) {
    errores.push("El precio de compra debe ser mayor a 0.");
  }

  const precioVenta = Number(data.precioVenta);
  if (precioVenta == null || isNaN(precioVenta) || precioVenta <= 0) {
    errores.push("El precio de venta debe ser mayor a 0.");
  }

  const stock = Number(data.stock);
  if (stock == null || isNaN(stock) || stock < 0) {
    errores.push("El stock no puede ser negativo.");
  }

  const stockMinimo = Number(data.stockMinimo);
  if (data.stockMinimo != null && data.stockMinimo !== "" && (isNaN(stockMinimo) || stockMinimo < 0)) {
    errores.push("El stock mínimo no puede ser negativo.");
  }

  return errores;
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.$or = [
      { codigo: regex },
      { nombre: regex },
      { categoria: regex },
      { marca: regex },
      { codigoBarras: regex },
    ];
  }

  if (filtros.activo === "true") query.activo = true;

  if (filtros.stockBajo === "true") {
    query.$expr = { $lte: ["$stock", "$stockMinimo"] };
  }

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [productos, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    productos,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function obtenerPorId(id) {
  const producto = await Product.findById(id);
  if (!producto) throw new Error("Producto no encontrado.");
  return producto;
}

export async function crear(data) {
  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const existe = await Product.findOne({ codigo: data.codigo.trim() });
  if (existe) {
    const err = new Error("Ya existe un producto con ese código.");
    err.errores = ["Ya existe un producto con ese código."];
    err.status = 400;
    throw err;
  }

  const producto = new Product({
    codigo: data.codigo.trim(),
    nombre: data.nombre.trim(),
    descripcion: data.descripcion || "",
    categoria: data.categoria || "",
    codigoBarras: data.codigoBarras || "",
    precioCompra: Number(data.precioCompra) || 0,
    precioVenta: Number(data.precioVenta),
    stock: Number(data.stock),
    stockMinimo: Number(data.stockMinimo) || 0,
    unidadMedida: data.unidadMedida || "Unidad",
    marca: data.marca || "",
    imagen: data.imagen || "",
    activo: data.activo !== undefined ? data.activo : true,
  });

  return await producto.save();
}

export async function actualizar(id, data) {
  const producto = await Product.findById(id);
  if (!producto) throw new Error("Producto no encontrado.");

  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const codigoTrim = data.codigo.trim();
  if (codigoTrim !== producto.codigo) {
    const existe = await Product.findOne({ codigo: codigoTrim, _id: { $ne: id } });
    if (existe) {
      const err = new Error("Ya existe otro producto con ese código.");
      err.errores = ["Ya existe otro producto con ese código."];
      err.status = 400;
      throw err;
    }
  }

  Object.assign(producto, {
    codigo: codigoTrim,
    nombre: data.nombre.trim(),
    descripcion: data.descripcion ?? producto.descripcion,
    categoria: data.categoria ?? producto.categoria,
    codigoBarras: data.codigoBarras ?? producto.codigoBarras,
    precioCompra: data.precioCompra != null && data.precioCompra !== "" ? Number(data.precioCompra) : producto.precioCompra,
    precioVenta: Number(data.precioVenta),
    stock: Number(data.stock),
    stockMinimo: data.stockMinimo != null && data.stockMinimo !== "" ? Number(data.stockMinimo) : producto.stockMinimo,
    unidadMedida: data.unidadMedida ?? producto.unidadMedida,
    marca: data.marca ?? producto.marca,
    imagen: data.imagen ?? producto.imagen,
    activo: data.activo !== undefined ? data.activo : producto.activo,
  });

  return await producto.save();
}

export async function eliminar(id) {
  const producto = await Product.findByIdAndDelete(id);
  if (!producto) throw new Error("Producto no encontrado.");
  return producto;
}

export async function obtenerStats() {
  const [total, stockBajo] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({
      $expr: { $lte: ["$stock", "$stockMinimo"] },
    }),
  ]);
  return { total, stockBajo };
}
