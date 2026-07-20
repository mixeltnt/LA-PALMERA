import Provider from "../models/providerModel.js";
import Product from "../models/productModel.js";

function validar(data) {
  const errores = [];

  if (!data.nombre || String(data.nombre).trim() === "") {
    errores.push("El nombre del proveedor es obligatorio.");
  }

  if (data.correo != null && data.correo !== "") {
    const correo = String(data.correo).trim();
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexCorreo.test(correo)) {
      errores.push("El correo debe tener un formato válido.");
    }
  }

  if (data.rut != null && String(data.rut).trim() !== "") {
    if (!validarRut(String(data.rut).trim())) {
      errores.push("El RUT ingresado no es válido.");
    }
  }

  return errores;
}

function normalizarTexto(valor) {
  if (valor == null) return "";
  return String(valor).trim();
}

function validarRut(rut) {
  const valor = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (!valor || valor.length < 2) return false;

  const cuerpo = valor.slice(0, -1);
  const dv = valor.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dvEsperado === dv;
}

function crearErrorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.errores = [mensaje];
  error.status = 400;
  return error;
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.$or = [
      { nombre: regex },
      { rut: regex },
      { contacto: regex },
      { telefono: regex },
      { correo: regex },
      { ciudad: regex },
    ];
  }

  if (filtros.activo === "true") query.activo = true;
  if (filtros.activo === "false") query.activo = false;

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [proveedores, total] = await Promise.all([
    Provider.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Provider.countDocuments(query),
  ]);

  return {
    proveedores,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listarTodas() {
  return await Provider.find({ activo: true }).sort({ nombre: 1 });
}

export async function obtenerPorId(id) {
  const proveedor = await Provider.findById(id);
  if (!proveedor) throw new Error("Proveedor no encontrado.");
  return proveedor;
}

export async function crear(data) {
  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const nombre = normalizarTexto(data.nombre);
  const existeNombre = await Provider.findOne({
    nombre: { $regex: new RegExp(`^${nombre}$`, "i") },
  });
  if (existeNombre) {
    throw crearErrorValidacion("Ya existe un proveedor con ese nombre.");
  }

  const rut = normalizarTexto(data.rut);
  if (rut) {
    const existeRut = await Provider.findOne({
      rut: { $regex: new RegExp(`^${rut}$`, "i") },
    });
    if (existeRut) {
      throw crearErrorValidacion("Ya existe un proveedor con ese RUT.");
    }
  }

  const proveedor = new Provider({
    nombre,
    rut,
    contacto: normalizarTexto(data.contacto),
    telefono: normalizarTexto(data.telefono),
    correo: normalizarTexto(data.correo),
    direccion: normalizarTexto(data.direccion),
    ciudad: normalizarTexto(data.ciudad),
    observaciones: normalizarTexto(data.observaciones),
    activo: data.activo !== undefined ? data.activo : true,
  });

  return await proveedor.save();
}

export async function actualizar(id, data) {
  const proveedor = await Provider.findById(id);
  if (!proveedor) throw new Error("Proveedor no encontrado.");

  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const nombre = normalizarTexto(data.nombre);
  if (nombre.toLowerCase() !== proveedor.nombre.toLowerCase()) {
    const existeNombre = await Provider.findOne({
      nombre: { $regex: new RegExp(`^${nombre}$`, "i") },
      _id: { $ne: id },
    });
    if (existeNombre) {
      throw crearErrorValidacion("Ya existe otro proveedor con ese nombre.");
    }
  }

  const rut = normalizarTexto(data.rut);
  if (rut && rut.toLowerCase() !== proveedor.rut.toLowerCase()) {
    const existeRut = await Provider.findOne({
      rut: { $regex: new RegExp(`^${rut}$`, "i") },
      _id: { $ne: id },
    });
    if (existeRut) {
      throw crearErrorValidacion("Ya existe otro proveedor con ese RUT.");
    }
  }

  Object.assign(proveedor, {
    nombre,
    rut,
    contacto: normalizarTexto(data.contacto),
    telefono: normalizarTexto(data.telefono),
    correo: normalizarTexto(data.correo),
    direccion: normalizarTexto(data.direccion),
    ciudad: normalizarTexto(data.ciudad),
    observaciones: normalizarTexto(data.observaciones),
    activo: data.activo !== undefined ? data.activo : proveedor.activo,
  });

  return await proveedor.save();
}

export async function eliminar(id) {
  const proveedor = await Provider.findById(id);
  if (!proveedor) throw new Error("Proveedor no encontrado.");

  const productosAsociados = await Product.countDocuments({
    proveedorPrincipal: id,
  });
  if (productosAsociados > 0) {
    const err = new Error(
      `No se puede eliminar el proveedor porque tiene ${productosAsociados} producto(s) asociado(s).`,
    );
    err.errores = [
      `El proveedor "${proveedor.nombre}" tiene ${productosAsociados} producto(s) asociado(s). Desasocia o elimina los productos primero.`,
    ];
    err.status = 400;
    throw err;
  }

  await Provider.findByIdAndDelete(id);
  return proveedor;
}

export async function obtenerStats() {
  const total = await Provider.countDocuments();
  const activas = await Provider.countDocuments({ activo: true });
  return { total, activas };
}
