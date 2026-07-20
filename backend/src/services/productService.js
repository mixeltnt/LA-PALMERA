import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import Provider from "../models/providerModel.js";

function validar(data) {
  const errores = [];

  if (!data.codigo || String(data.codigo).trim() === "") {
    errores.push("El código del producto es obligatorio.");
  }

  if (!data.nombre || String(data.nombre).trim() === "") {
    errores.push("El nombre del producto es obligatorio.");
  }

  const precioCompra = Number(data.precioCompra);
  if (
    data.precioCompra != null &&
    data.precioCompra !== "" &&
    (Number.isNaN(precioCompra) || precioCompra < 0)
  ) {
    errores.push("El precio de compra debe ser mayor o igual a 0.");
  }

  const precioVenta = Number(data.precioVenta);
  if (precioVenta == null || Number.isNaN(precioVenta) || precioVenta <= 0) {
    errores.push("El precio de venta debe ser mayor a 0.");
  }

  if (
    !Number.isNaN(precioVenta) &&
    !Number.isNaN(precioCompra) &&
    precioCompra != null &&
    precioCompra !== "" &&
    precioVenta < precioCompra
  ) {
    errores.push(
      "El precio de venta no puede ser menor que el precio de compra.",
    );
  }

  const stockActual = Number(data.stockActual);
  if (Number.isNaN(stockActual) || stockActual < 0) {
    errores.push("El stock actual no puede ser negativo.");
  }

  const stockMinimo = Number(data.stockMinimo);
  if (
    data.stockMinimo != null &&
    data.stockMinimo !== "" &&
    (Number.isNaN(stockMinimo) || stockMinimo < 0)
  ) {
    errores.push("El stock mínimo no puede ser negativo.");
  }

  return errores;
}

function normalizarTexto(valor) {
  if (valor == null) return "";
  return String(valor).trim();
}

function validarCodigoBarras(valor) {
  if (valor == null || valor === "") return null;

  const texto = String(valor).trim();
  if (texto === "") return null;

  if (!/^\d{8,14}$/.test(texto)) {
    throw new Error("El código de barras debe tener entre 8 y 14 dígitos.");
  }

  return texto;
}

function crearErrorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.errores = [mensaje];
  error.status = 400;
  return error;
}

async function resolverCategoria(valor) {
  if (valor == null || valor === "") return null;

  if (typeof valor === "object" && valor._id) {
    const categoria = await Category.findById(valor._id);
    if (!categoria)
      throw crearErrorValidacion("La categoría seleccionada no existe.");
    return categoria._id;
  }

  const texto = normalizarTexto(valor);
  if (!texto) return null;

  if (/^[a-fA-F0-9]{24}$/.test(texto)) {
    const categoria = await Category.findById(texto);
    if (!categoria)
      throw crearErrorValidacion("La categoría seleccionada no existe.");
    return categoria._id;
  }

  const categoria = await Category.findOne({
    nombre: { $regex: `^${texto}$`, $options: "i" },
  });
  if (!categoria) {
    throw crearErrorValidacion(
      "La categoría especificada no existe. Debe crearse desde el módulo de categorías.",
    );
  }

  return categoria._id;
}

async function resolverProveedor(valor) {
  if (valor == null || valor === "") return null;

  if (typeof valor === "object" && valor._id) {
    const proveedor = await Provider.findById(valor._id);
    if (!proveedor)
      throw crearErrorValidacion("El proveedor seleccionado no existe.");
    return proveedor._id;
  }

  const texto = normalizarTexto(valor);
  if (!texto) return null;

  if (/^[a-fA-F0-9]{24}$/.test(texto)) {
    const proveedor = await Provider.findById(texto);
    if (!proveedor)
      throw crearErrorValidacion("El proveedor seleccionado no existe.");
    return proveedor._id;
  }

  const proveedor = await Provider.findOne({
    nombre: { $regex: `^${texto}$`, $options: "i" },
  });
  if (!proveedor) {
    throw crearErrorValidacion(
      "El proveedor especificado no existe. Debe crearse desde el módulo de proveedores.",
    );
  }

  return proveedor._id;
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.$or = [
      { codigo: regex },
      { nombre: regex },
      { marca: regex },
      { codigoBarras: regex },
    ];
  }

  if (filtros.activo === "true") query.activo = true;

  if (filtros.stockBajo === "true") {
    query.$expr = { $lte: ["$stockActual", "$stockMinimo"] };
  }

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [productos, total] = await Promise.all([
    Product.find(query)
      .populate("categoria", "nombre activo")
      .populate("proveedorPrincipal", "nombre activo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
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
  const producto = await Product.findById(id)
    .populate("categoria", "nombre activo")
    .populate("proveedorPrincipal", "nombre activo");
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

  const codigo = normalizarTexto(data.codigo);
  const existeCodigo = await Product.findOne({ codigo });
  if (existeCodigo) {
    const err = new Error("Ya existe un producto con ese código.");
    err.errores = ["Ya existe un producto con ese código."];
    err.status = 400;
    throw err;
  }

  let codigoBarras = null;
  if (data.codigoBarras != null && data.codigoBarras !== "") {
    codigoBarras = validarCodigoBarras(data.codigoBarras);
    if (codigoBarras) {
      const existeCodigoBarras = await Product.findOne({ codigoBarras });
      if (existeCodigoBarras) {
        const err = new Error(
          "Ya existe un producto con ese código de barras.",
        );
        err.errores = ["Ya existe un producto con ese código de barras."];
        err.status = 400;
        throw err;
      }
    }
  }

  const categoria = await resolverCategoria(data.categoria);
  const proveedorPrincipal = await resolverProveedor(data.proveedorPrincipal);

  const producto = new Product({
    codigo,
    codigoBarras,
    nombre: normalizarTexto(data.nombre),
    descripcion: normalizarTexto(data.descripcion),
    marca: normalizarTexto(data.marca),
    categoria,
    proveedorPrincipal,
    precioCompra:
      data.precioCompra != null && data.precioCompra !== ""
        ? Number(data.precioCompra)
        : 0,
    precioVenta: Number(data.precioVenta),
    stockActual: Number(data.stockActual),
    stockMinimo:
      data.stockMinimo != null && data.stockMinimo !== ""
        ? Number(data.stockMinimo)
        : 0,
    unidadMedida: normalizarTexto(data.unidadMedida) || "Unidad",
    imagen: normalizarTexto(data.imagen),
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

  const codigo = normalizarTexto(data.codigo);
  if (codigo !== producto.codigo) {
    const existeCodigo = await Product.findOne({ codigo, _id: { $ne: id } });
    if (existeCodigo) {
      const err = new Error("Ya existe otro producto con ese código.");
      err.errores = ["Ya existe otro producto con ese código."];
      err.status = 400;
      throw err;
    }
  }

  let codigoBarras = producto.codigoBarras;
  if (data.codigoBarras != null && data.codigoBarras !== "") {
    codigoBarras = validarCodigoBarras(data.codigoBarras);
    if (codigoBarras && codigoBarras !== producto.codigoBarras) {
      const existeCodigoBarras = await Product.findOne({
        codigoBarras,
        _id: { $ne: id },
      });
      if (existeCodigoBarras) {
        const err = new Error(
          "Ya existe otro producto con ese código de barras.",
        );
        err.errores = ["Ya existe otro producto con ese código de barras."];
        err.status = 400;
        throw err;
      }
    }
  } else {
    codigoBarras = null;
  }

  const categoria = await resolverCategoria(data.categoria);
  const proveedorPrincipal = await resolverProveedor(data.proveedorPrincipal);

  Object.assign(producto, {
    codigo,
    codigoBarras,
    nombre: normalizarTexto(data.nombre),
    descripcion:
      data.descripcion != null
        ? normalizarTexto(data.descripcion)
        : producto.descripcion,
    marca: data.marca != null ? normalizarTexto(data.marca) : producto.marca,
    categoria: categoria ?? producto.categoria,
    proveedorPrincipal: proveedorPrincipal ?? producto.proveedorPrincipal,
    precioCompra:
      data.precioCompra != null && data.precioCompra !== ""
        ? Number(data.precioCompra)
        : producto.precioCompra,
    precioVenta: Number(data.precioVenta),
    stockActual: Number(data.stockActual),
    stockMinimo:
      data.stockMinimo != null && data.stockMinimo !== ""
        ? Number(data.stockMinimo)
        : producto.stockMinimo,
    unidadMedida:
      data.unidadMedida != null
        ? normalizarTexto(data.unidadMedida) || "Unidad"
        : producto.unidadMedida,
    imagen:
      data.imagen != null ? normalizarTexto(data.imagen) : producto.imagen,
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
      $expr: { $lte: ["$stockActual", "$stockMinimo"] },
    }),
  ]);
  return { total, stockBajo };
}
