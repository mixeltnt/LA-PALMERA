import mongoose from "mongoose";
import Venta from "../models/ventaModel.js";
import DetalleVenta from "../models/detalleVentaModel.js";
import Product from "../models/productModel.js";
import Client from "../models/clientModel.js";
import * as movimientoCuentaService from "./movimientoCuentaService.js";

const METODOS_PAGO_VALIDOS = new Set([
  "EFECTIVO",
  "DEBITO",
  "CREDITO",
  "TRANSFERENCIA",
  "CAJA_VECINA",
  "FIADO",
]);

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

function validarVenta(data) {
  const errores = [];

  if (data.cliente && String(data.cliente).trim() !== "") {
    if (!mongoose.isValidObjectId(data.cliente)) {
      errores.push("El cliente seleccionado no es válido.");
    }
  }

  if (!data.usuario) errores.push("El usuario es obligatorio.");

  if (!data.metodoPago || normalizarTexto(data.metodoPago) === "") {
    errores.push("El método de pago es obligatorio.");
  } else if (!METODOS_PAGO_VALIDOS.has(normalizarTexto(data.metodoPago))) {
    errores.push("El método de pago no es válido.");
  }

  const descuento = Number(data.descuento);
  if (
    data.descuento != null &&
    data.descuento !== "" &&
    (!Number.isFinite(descuento) || descuento < 0)
  ) {
    errores.push("El descuento de la venta no puede ser negativo.");
  }

  if (!Array.isArray(data.productos) || data.productos.length === 0) {
    errores.push("La venta debe tener al menos un producto.");
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
        "No se permiten productos duplicados dentro de la misma venta.",
      );
      return;
    }
    vistos.add(String(item.producto));

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      errores.push(`La cantidad de la línea ${index + 1} debe ser mayor a 0.`);
    }

    const precioUnitario = Number(item.precioUnitario);
    if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
      errores.push(
        `El precio unitario de la línea ${index + 1} debe ser mayor a 0.`,
      );
    }

    const descuento = Number(item.descuento ?? 0);
    if (!Number.isFinite(descuento) || descuento < 0) {
      errores.push(
        `El descuento de la línea ${index + 1} no puede ser negativo.`,
      );
    }
  });

  return errores;
}

async function validarReferencias(data) {
  if (data.cliente && String(data.cliente).trim() !== "") {
    const cliente = await Client.findById(data.cliente);
    if (!cliente) {
      throw crearErrorValidacion("El cliente seleccionado no existe.");
    }
    if (!cliente.activo) {
      throw crearErrorValidacion("El cliente seleccionado está inactivo.");
    }
  }

  for (const item of data.productos) {
    const producto = await Product.findById(item.producto);
    if (!producto) {
      throw crearErrorValidacion("Uno o más productos no existen.");
    }
    if (!producto.activo) {
      throw crearErrorValidacion("No se pueden vender productos inactivos.");
    }
  }
}

function calcularLinea(item) {
  const cantidad = Number(item.cantidad);
  const precioUnitario = Number(item.precioUnitario);
  const descuento = Number(item.descuento ?? 0);
  const bruto = cantidad * precioUnitario;
  const subtotal = bruto - descuento;

  if (subtotal < 0) {
    throw crearErrorValidacion(
      "El subtotal de una línea no puede ser negativo.",
    );
  }

  return {
    cantidad,
    precioUnitario,
    descuento,
    subtotal,
  };
}

function calcularTotales(detalles, descuentoVenta = 0) {
  const subtotal = detalles.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - Number(descuentoVenta || 0);

  if (total < 0) {
    throw crearErrorValidacion("El total de la venta no puede ser negativo.");
  }

  return {
    subtotal,
    total,
  };
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.$or = [
      {
        numeroVenta: Number.isFinite(Number(filtros.search))
          ? Number(filtros.search)
          : undefined,
      },
      { metodoPago: regex },
      { observaciones: regex },
    ].filter(Boolean);

    const clientesPorNombre = await Client.find({ nombre: regex }).select(
      "_id",
    );
    if (clientesPorNombre.length > 0) {
      query.$or.push({
        cliente: { $in: clientesPorNombre.map((cliente) => cliente._id) },
      });
    }
  }

  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.cliente) query.cliente = filtros.cliente;
  if (filtros.metodoPago) query.metodoPago = filtros.metodoPago;

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [ventas, total] = await Promise.all([
    Venta.find(query)
      .populate("cliente", "nombre rut")
      .populate("usuario", "nombre usuario")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Venta.countDocuments(query),
  ]);

  return {
    ventas,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function obtenerPorId(id) {
  const venta = await Venta.findById(id)
    .populate("cliente", "nombre rut")
    .populate("usuario", "nombre usuario");
  if (!venta) throw new Error("Venta no encontrada.");

  const detalles = await DetalleVenta.find({ venta: id }).populate(
    "producto",
    "codigo nombre precioCompra precioVenta stockActual activo",
  );

  return { venta, detalles };
}

export async function crear(data) {
  const errores = validarVenta(data);
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

  const venta = new Venta({
    cliente:
      data.cliente && String(data.cliente).trim() !== "" ? data.cliente : null,
    usuario: data.usuario,
    fecha: data.fecha || new Date(),
    estado: "BORRADOR",
    subtotal: 0,
    descuento: Number(data.descuento || 0),
    total: 0,
    metodoPago: normalizarTexto(data.metodoPago),
    observaciones: normalizarTexto(data.observaciones),
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ventaGuardada = await venta.save({ session });

    const detalles = data.productos.map((item) => {
      const linea = calcularLinea(item);
      return {
        venta: ventaGuardada._id,
        producto: item.producto,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        descuento: linea.descuento,
        subtotal: linea.subtotal,
      };
    });

    await DetalleVenta.insertMany(detalles, { session });

    const totales = calcularTotales(detalles, ventaGuardada.descuento);
    ventaGuardada.subtotal = totales.subtotal;
    ventaGuardada.total = totales.total;
    await ventaGuardada.save({ session });

    await session.commitTransaction();
    session.endSession();
    return ventaGuardada;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function actualizar(id, data) {
  const venta = await Venta.findById(id);
  if (!venta) throw new Error("Venta no encontrada.");
  if (venta.estado !== "BORRADOR") {
    throw crearErrorValidacion(
      "Solo se puede editar una venta en estado BORRADOR.",
    );
  }

  const errores = validarVenta(data);
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
    Object.assign(venta, {
      cliente:
        data.cliente && String(data.cliente).trim() !== ""
          ? data.cliente
          : null,
      usuario: data.usuario,
      fecha: data.fecha || venta.fecha,
      descuento: Number(data.descuento || 0),
      metodoPago: normalizarTexto(data.metodoPago),
      observaciones: normalizarTexto(data.observaciones),
    });

    await venta.save({ session });
    await DetalleVenta.deleteMany({ venta: id }, { session });

    const detalles = data.productos.map((item) => {
      const linea = calcularLinea(item);
      return {
        venta: venta._id,
        producto: item.producto,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        descuento: linea.descuento,
        subtotal: linea.subtotal,
      };
    });

    await DetalleVenta.insertMany(detalles, { session });

    const totales = calcularTotales(detalles, venta.descuento);
    venta.subtotal = totales.subtotal;
    venta.total = totales.total;
    await venta.save({ session });

    await session.commitTransaction();
    session.endSession();
    return venta;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function confirmar(id) {
  const venta = await Venta.findById(id);
  if (!venta) throw new Error("Venta no encontrada.");
  if (venta.estado === "CONFIRMADA") {
    throw crearErrorValidacion("La venta ya está confirmada.");
  }
  if (venta.estado === "ANULADA") {
    throw crearErrorValidacion("No se puede confirmar una venta anulada.");
  }

  if (venta.metodoPago === "FIADO" && !venta.cliente) {
    throw crearErrorValidacion(
      "Una venta fiada requiere seleccionar un cliente registrado.",
    );
  }

  let cliente = null;
  if (venta.cliente) {
    cliente = await Client.findById(venta.cliente);
    if (!cliente) {
      throw crearErrorValidacion("El cliente seleccionado no existe.");
    }
    if (!cliente.activo) {
      throw crearErrorValidacion("El cliente seleccionado está inactivo.");
    }
  }

  if (venta.metodoPago === "FIADO" && cliente) {
    const limiteFiado = Number(cliente.limiteFiado || 0);
    if (limiteFiado <= 0) {
      throw crearErrorValidacion(
        "El cliente no tiene límite de fiado configurado. Configúralo al editar el cliente.",
      );
    }

    const saldoPendiente =
      await movimientoCuentaService.obtenerSaldoCliente(venta.cliente);
    const deudaProyectada = saldoPendiente + venta.total;
    if (deudaProyectada > limiteFiado) {
      throw crearErrorValidacion(
        `La venta supera el crédito disponible del cliente (deuda actual: $${saldoPendiente.toLocaleString("es-CL")}, límite: $${limiteFiado.toLocaleString("es-CL")}).`,
      );
    }
  }

  const detalles = await DetalleVenta.find({ venta: id });
  if (!detalles.length) {
    throw crearErrorValidacion("La venta debe tener al menos un producto.");
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

      if (!producto.activo) {
        throw crearErrorValidacion("No se pueden vender productos inactivos.");
      }

      const stockActual = Number(producto.stockActual);
      const cantidad = Number(detalle.cantidad);

      if (cantidad > stockActual) {
        throw crearErrorValidacion(
          `No hay stock suficiente para el producto ${producto.nombre}.`,
        );
      }

      producto.stockActual = stockActual - cantidad;
      await producto.save({ session });
    }

    venta.estado = "CONFIRMADA";

    if (venta.metodoPago === "FIADO") {
      await movimientoCuentaService.registrarVentaFiada({
        clienteId: venta.cliente,
        ventaId: venta._id,
        monto: venta.total,
        usuarioId: venta.usuario,
        observacion: `Venta fiada #${venta.numeroVenta}`,
        session,
      });
    }

    await venta.save({ session });

    await session.commitTransaction();
    session.endSession();
    return venta;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

export async function anular(id) {
  const venta = await Venta.findById(id);
  if (!venta) throw new Error("Venta no encontrada.");
  if (venta.estado === "ANULADA") {
    throw crearErrorValidacion("La venta ya está anulada.");
  }

  const detalles = await DetalleVenta.find({ venta: id });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (venta.estado === "CONFIRMADA") {
      for (const detalle of detalles) {
        const producto = await Product.findById(detalle.producto).session(
          session,
        );
        if (!producto) {
          throw crearErrorValidacion("Uno o más productos no existen.");
        }

        producto.stockActual =
          Number(producto.stockActual) + Number(detalle.cantidad);
        await producto.save({ session });
      }

      if (venta.metodoPago === "FIADO") {
        await movimientoCuentaService.anularPorVenta({
          ventaId: venta._id,
          clienteId: venta.cliente,
          montoVenta: venta.total,
          numeroVenta: venta.numeroVenta,
          usuarioId: venta.usuario,
          session,
        });
      }
    }

    venta.estado = "ANULADA";
    await venta.save({ session });

    await session.commitTransaction();
    session.endSession();
    return venta;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

function parseFechaLocal(fechaTexto) {
  if (!fechaTexto) return null;
  const [anio, mes, dia] = String(fechaTexto).split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function diaSiguiente(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate() + 1,
  );
}

function rangoFechas(filtros) {
  const match = {};
  const desde = parseFechaLocal(filtros.desde);
  const hasta = parseFechaLocal(filtros.hasta);

  if (desde) match.$gte = desde;
  if (hasta) match.$lt = diaSiguiente(hasta);

  return Object.keys(match).length > 0 ? match : null;
}

export async function obtenerEstadisticas(filtros = {}) {
  const matchFechas = rangoFechas(filtros);
  const match = {};
  if (matchFechas) match.fecha = matchFechas;
  if (filtros.metodoPago) match.metodoPago = filtros.metodoPago;

  const [resultado] = await Venta.aggregate([
    { $match: match },
    {
      $facet: {
        confirmadas: [
          { $match: { estado: "CONFIRMADA" } },
          {
            $group: {
              _id: "$metodoPago",
              cantidad: { $sum: 1 },
              monto: { $sum: "$total" },
            },
          },
        ],
        anuladas: [
          { $match: { estado: "ANULADA" } },
          {
            $group: {
              _id: null,
              cantidad: { $sum: 1 },
              monto: { $sum: "$total" },
            },
          },
        ],
      },
    },
  ]);

  const porMetodoPago = (resultado?.confirmadas || []).map((grupo) => ({
    metodoPago: grupo._id,
    cantidad: grupo.cantidad,
    monto: grupo.monto,
  }));

  const totalVendido = porMetodoPago.reduce((suma, grupo) => suma + grupo.monto, 0);
  const cantidadConfirmadas = porMetodoPago.reduce(
    (suma, grupo) => suma + grupo.cantidad,
    0,
  );
  const anuladas = resultado?.anuladas?.[0] || { cantidad: 0, monto: 0 };

  return {
    resumen: {
      totalVendido,
      cantidadVentasConfirmadas: cantidadConfirmadas,
      ticketPromedio:
        cantidadConfirmadas > 0 ? Math.round(totalVendido / cantidadConfirmadas) : 0,
      ventasAnuladas: anuladas.cantidad || 0,
      montoAnulado: anuladas.monto || 0,
    },
    porMetodoPago,
  };
}

export async function obtenerProductosMasVendidos(filtros = {}) {
  const limit = Math.min(100, Math.max(1, parseInt(filtros.limit) || 10));

  const match = {
    "ventaDoc.estado": "CONFIRMADA",
  };
  const matchFechas = rangoFechas(filtros);
  if (matchFechas) match["ventaDoc.fecha"] = matchFechas;

  return await DetalleVenta.aggregate([
    {
      $lookup: {
        from: "ventas",
        localField: "venta",
        foreignField: "_id",
        as: "ventaDoc",
      },
    },
    { $unwind: "$ventaDoc" },
    { $match: match },
    {
      $group: {
        _id: "$producto",
        cantidad: { $sum: "$cantidad" },
        monto: { $sum: "$subtotal" },
      },
    },
    { $sort: { cantidad: -1, monto: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productoDoc",
      },
    },
    { $unwind: { path: "$productoDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        producto: {
          _id: "$_id",
          nombre: { $ifNull: ["$productoDoc.nombre", "Producto eliminado"] },
          codigo: { $ifNull: ["$productoDoc.codigo", ""] },
        },
        cantidad: 1,
        monto: 1,
      },
    },
  ]);
}

export async function obtenerSerieDiaria(filtros = {}) {
  const dias = Math.min(30, Math.max(1, parseInt(filtros.dias) || 7));
  const hoy = new Date();
  const inicio = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() - (dias - 1),
  );
  const fin = diaSiguiente(hoy);

  const ventas = await Venta.find({
    estado: "CONFIRMADA",
    fecha: { $gte: inicio, $lt: fin },
  })
    .select("fecha total")
    .lean();

  const porDia = new Map();
  for (const venta of ventas) {
    const fecha = venta.fecha instanceof Date ? venta.fecha : new Date(venta.fecha);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    const actual = porDia.get(clave) || { cantidad: 0, monto: 0 };
    actual.cantidad += 1;
    actual.monto += Number(venta.total || 0);
    porDia.set(clave, actual);
  }

  const serie = [];
  for (let i = 0; i < dias; i += 1) {
    const fecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() - (dias - 1 - i),
    );
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    const datos = porDia.get(clave) || { cantidad: 0, monto: 0 };
    serie.push({
      fecha: clave,
      cantidad: datos.cantidad,
      monto: datos.monto,
    });
  }

  return { serie };
}
