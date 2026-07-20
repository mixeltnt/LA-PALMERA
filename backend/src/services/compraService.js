import mongoose from "mongoose";
import Compra from "../models/compraModel.js";
import DetalleCompra from "../models/detalleCompraModel.js";
import Product from "../models/productModel.js";
import Provider from "../models/providerModel.js";

function normalizarTexto(valor) {
  if (valor == null) return "";
  return String(valor).trim();
}

function crearErrorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.errores = [mensaje];
  error.status = 400;
  return error;
}

function validarCompra(data) {
  const errores = [];

  if (!data.proveedor) errores.push("El proveedor es obligatorio.");
  if (!data.numeroDocumento || normalizarTexto(data.numeroDocumento) === "") {
    errores.push("El número de documento es obligatorio.");
  }
  if (!Array.isArray(data.productos) || data.productos.length === 0) {
    errores.push("La compra debe tener al menos un producto.");
  }

  return errores;
}

function validarLineas(productos) {
  const errores = [];
  const vistos = new Set();

  productos.forEach((item, index) => {
    if (!item.producto) {
      errores.push(`La línea ${index + 1} debe incluir un producto.`);
      return;
    }

    if (vistos.has(String(item.producto))) {
      errores.push(
        `No se permiten productos duplicados dentro de la misma compra.`,
      );
      return;
    }
    vistos.add(String(item.producto));

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      errores.push(`La cantidad de la línea ${index + 1} debe ser mayor a 0.`);
    }

    const precioCompra = Number(item.precioCompra);
    if (!Number.isFinite(precioCompra) || precioCompra <= 0) {
      errores.push(
        `El precio de compra de la línea ${index + 1} debe ser mayor a 0.`,
      );
    }
  });

  return errores;
}

async function validarReferencias(data) {
  const proveedor = await Provider.findById(data.proveedor);
  if (!proveedor)
    throw crearErrorValidacion("El proveedor seleccionado no existe.");

  for (const item of data.productos) {
    const producto = await Product.findById(item.producto);
    if (!producto) {
      throw crearErrorValidacion("Uno o más productos no existen.");
    }
    if (!producto.activo) {
      throw crearErrorValidacion(
        "No se pueden usar productos inactivos en una compra.",
      );
    }
  }
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.$or = [{ numeroDocumento: regex }];
  }

  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.proveedor) query.proveedor = filtros.proveedor;

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [compras, total] = await Promise.all([
    Compra.find(query)
      .populate("proveedor", "nombre")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Compra.countDocuments(query),
  ]);

  return {
    compras,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function obtenerPorId(id) {
  const compra = await Compra.findById(id).populate(
    "proveedor",
    "nombre rut contacto",
  );
  if (!compra) throw new Error("Compra no encontrada.");

  const detalles = await DetalleCompra.find({ compra: id }).populate(
    "producto",
    "codigo nombre precioCompra precioVenta stockActual",
  );
  return { compra, detalles };
}

export async function crear(data) {
  const errores = validarCompra(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const lineErrors = validarLineas(data.productos);
  if (lineErrors.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = lineErrors;
    err.status = 400;
    throw err;
  }

  await validarReferencias(data);

  const compra = new Compra({
    proveedor: data.proveedor,
    fechaCompra: data.fechaCompra || new Date(),
    numeroDocumento: normalizarTexto(data.numeroDocumento),
    observaciones: normalizarTexto(data.observaciones),
    estado: data.estado || "BORRADOR",
    total: 0,
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const compraGuardada = await compra.save({ session });

    const detalles = data.productos.map((item) => ({
      compra: compraGuardada._id,
      producto: item.producto,
      cantidad: Number(item.cantidad),
      precioCompra: Number(item.precioCompra),
      subtotal: Number(item.cantidad) * Number(item.precioCompra),
    }));

    await DetalleCompra.insertMany(detalles, { session });

    const total = detalles.reduce((sum, item) => sum + item.subtotal, 0);
    compraGuardada.total = total;
    await compraGuardada.save({ session });

    await session.commitTransaction();
    session.endSession();
    return compraGuardada;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function actualizar(id, data) {
  const compra = await Compra.findById(id);
  if (!compra) throw new Error("Compra no encontrada.");
  if (compra.estado === "CONFIRMADA") {
    throw crearErrorValidacion("No se puede editar una compra confirmada.");
  }

  const errores = validarCompra(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const lineErrors = validarLineas(data.productos);
  if (lineErrors.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = lineErrors;
    err.status = 400;
    throw err;
  }

  await validarReferencias(data);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Object.assign(compra, {
      proveedor: data.proveedor,
      fechaCompra: data.fechaCompra || compra.fechaCompra,
      numeroDocumento: normalizarTexto(data.numeroDocumento),
      observaciones: normalizarTexto(data.observaciones),
      estado: data.estado || compra.estado,
    });

    await compra.save({ session });
    await DetalleCompra.deleteMany({ compra: id }, { session });

    const detalles = data.productos.map((item) => ({
      compra: compra._id,
      producto: item.producto,
      cantidad: Number(item.cantidad),
      precioCompra: Number(item.precioCompra),
      subtotal: Number(item.cantidad) * Number(item.precioCompra),
    }));

    await DetalleCompra.insertMany(detalles, { session });

    const total = detalles.reduce((sum, item) => sum + item.subtotal, 0);
    compra.total = total;
    await compra.save({ session });

    await session.commitTransaction();
    session.endSession();
    return compra;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function confirmar(id) {
  const compra = await Compra.findById(id);
  if (!compra) throw new Error("Compra no encontrada.");
  if (compra.estado === "CONFIRMADA") {
    throw crearErrorValidacion("La compra ya está confirmada.");
  }

  const detalles = await DetalleCompra.find({ compra: id });
  if (!detalles.length) {
    throw crearErrorValidacion("La compra debe tener al menos un producto.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const detalle of detalles) {
      const producto = await Product.findById(detalle.producto).session(
        session,
      );
      if (!producto) {
        throw crearErrorValidacion("Uno o más productos no existen.");
      }

      producto.stockActual =
        Number(producto.stockActual) + Number(detalle.cantidad);
      producto.precioCompra = Number(detalle.precioCompra);
      await producto.save({ session });
    }

    compra.estado = "CONFIRMADA";
    await compra.save({ session });

    await session.commitTransaction();
    session.endSession();
    return compra;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}
