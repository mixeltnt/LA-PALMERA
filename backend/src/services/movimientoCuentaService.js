import mongoose from "mongoose";
import Client from "../models/clientModel.js";
import MovimientoCuenta from "../models/movimientoCuentaModel.js";

function crearErrorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.errores = [mensaje];
  error.status = 400;
  return error;
}

function normalizarTexto(valor) {
  if (valor == null) return "";
  return String(valor).trim();
}

function validarClienteId(clienteId) {
  if (!mongoose.isValidObjectId(clienteId)) {
    throw crearErrorValidacion("El cliente seleccionado no es válido.");
  }
}

function calcularSaldoDesdeMovimientos(movimientos) {
  return movimientos.reduce((saldo, movimiento) => {
    if (movimiento.estado !== "ACTIVO") {
      return saldo;
    }

    if (
      movimiento.tipoMovimiento === "VENTA_FIADA" ||
      movimiento.tipoMovimiento === "REVERSO_ABONO"
    ) {
      return saldo + Number(movimiento.monto || 0);
    }

    if (movimiento.tipoMovimiento === "ABONO") {
      return saldo - Number(movimiento.monto || 0);
    }

    return saldo;
  }, 0);
}

export async function registrarVentaFiada({
  clienteId,
  ventaId,
  monto,
  usuarioId,
  observacion = "",
  session,
}) {
  validarClienteId(clienteId);

  const montoNumerico = Number(monto);
  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    throw crearErrorValidacion(
      "El monto de la venta fiada debe ser mayor a 0.",
    );
  }

  const movimiento = new MovimientoCuenta({
    cliente: clienteId,
    tipoMovimiento: "VENTA_FIADA",
    venta: ventaId,
    monto: montoNumerico,
    fecha: new Date(),
    usuario: usuarioId,
    observacion: normalizarTexto(observacion),
    estado: "ACTIVO",
  });

  return movimiento.save(session ? { session } : undefined);
}

export async function registrarAbono({
  clienteId,
  monto,
  usuarioId,
  observacion = "",
  session,
}) {
  validarClienteId(clienteId);

  const montoNumerico = Number(monto);
  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    throw crearErrorValidacion("El monto del abono debe ser mayor a 0.");
  }

  const cliente = await Client.findById(clienteId);
  if (!cliente) {
    throw crearErrorValidacion("El cliente seleccionado no existe.");
  }
  if (!cliente.activo) {
    throw crearErrorValidacion("El cliente seleccionado está inactivo.");
  }

  const saldoPendiente = await obtenerSaldoCliente(clienteId);
  if (montoNumerico > saldoPendiente) {
    throw crearErrorValidacion(
      `El abono no puede superar la deuda pendiente del cliente (deuda actual: $${saldoPendiente.toLocaleString("es-CL")}).`,
    );
  }

  const movimiento = new MovimientoCuenta({
    cliente: clienteId,
    tipoMovimiento: "ABONO",
    venta: null,
    monto: montoNumerico,
    fecha: new Date(),
    usuario: usuarioId,
    observacion: normalizarTexto(observacion),
    estado: "ACTIVO",
  });

  return movimiento.save(session ? { session } : undefined);
}

export async function obtenerResumenSaldo(clienteId) {
  validarClienteId(clienteId);

  const cliente = await Client.findById(clienteId).select(
    "nombre rut activo limiteFiado",
  );
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }
  if (!cliente.activo) {
    throw crearErrorValidacion("El cliente está inactivo.");
  }

  const saldoPendiente = await obtenerSaldoCliente(clienteId);
  const limiteFiado = Number(cliente.limiteFiado || 0);
  const disponible =
    limiteFiado > 0 ? Math.max(0, limiteFiado - saldoPendiente) : 0;

  return {
    cliente: {
      _id: cliente._id,
      nombre: cliente.nombre,
      rut: cliente.rut,
      activo: cliente.activo,
      limiteFiado,
    },
    saldoPendiente,
    limiteFiado,
    disponible,
  };
}

export async function anularPorVenta({
  ventaId,
  clienteId,
  montoVenta,
  numeroVenta,
  usuarioId,
  session,
}) {
  if (!mongoose.isValidObjectId(ventaId)) {
    throw crearErrorValidacion("La venta no es válida.");
  }

  validarClienteId(clienteId);

  const resultado = await MovimientoCuenta.updateMany(
    {
      venta: ventaId,
      tipoMovimiento: "VENTA_FIADA",
      estado: "ACTIVO",
    },
    {
      $set: {
        estado: "ANULADO",
      },
    },
    session ? { session } : undefined,
  );

  const saldoActual = await obtenerSaldoCliente(clienteId);
  const exceso = Math.max(0, Number(montoVenta || 0) - saldoActual);

  if (exceso > 0) {
    const movimiento = new MovimientoCuenta({
      cliente: clienteId,
      tipoMovimiento: "REVERSO_ABONO",
      venta: ventaId,
      monto: exceso,
      fecha: new Date(),
      usuario: usuarioId,
      observacion: numeroVenta
        ? `Reverso de abonos por anulación de la venta #${numeroVenta}`
        : "Reverso de abonos por anulación de venta",
      estado: "ACTIVO",
    });

    return movimiento.save(session ? { session } : undefined);
  }

  return resultado;
}

export async function listarPorCliente(clienteId) {
  validarClienteId(clienteId);

  const cliente = await Client.findById(clienteId).select(
    "nombre rut activo limiteFiado",
  );
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  const movimientosAsc = await MovimientoCuenta.find({ cliente: clienteId })
    .populate("venta", "numeroVenta estado total metodoPago")
    .populate("usuario", "nombre usuario")
    .sort({ fecha: 1, createdAt: 1 });

  let saldoAcumulado = 0;
  const movimientosConSaldo = movimientosAsc.map((movimiento) => {
    if (movimiento.estado === "ACTIVO") {
      if (
        movimiento.tipoMovimiento === "VENTA_FIADA" ||
        movimiento.tipoMovimiento === "REVERSO_ABONO"
      ) {
        saldoAcumulado += Number(movimiento.monto || 0);
      }

      if (movimiento.tipoMovimiento === "ABONO") {
        saldoAcumulado -= Number(movimiento.monto || 0);
      }
    }

    return {
      ...movimiento.toObject(),
      saldoResultante: saldoAcumulado,
    };
  });

  const saldoPendiente = saldoAcumulado;

  const movimientos = movimientosConSaldo.reverse();

  return {
    cliente,
    saldoPendiente,
    movimientos,
  };
}

export async function obtenerSaldoCliente(clienteId) {
  validarClienteId(clienteId);

  const movimientos = await MovimientoCuenta.find({ cliente: clienteId }).sort({
    fecha: 1,
    createdAt: 1,
  });

  return calcularSaldoDesdeMovimientos(movimientos);
}
