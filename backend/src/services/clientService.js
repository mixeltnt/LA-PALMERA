import Client from "../models/clientModel.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(data) {
  const errores = [];

  if (!data.nombre || data.nombre.trim() === "") {
    errores.push("El nombre del cliente es obligatorio.");
  }

  if (!data.rut || data.rut.trim() === "") {
    errores.push("El RUT del cliente es obligatorio.");
  }

  if (data.email && data.email.trim() !== "" && !EMAIL_REGEX.test(data.email.trim())) {
    errores.push("El formato del email no es válido.");
  }

  return errores;
}

export async function listar(filtros = {}) {
  const query = {};

  if (filtros.search) {
    const regex = new RegExp(filtros.search, "i");
    query.$or = [
      { nombre: regex },
      { rut: regex },
      { telefono: regex },
    ];
  }

  if (filtros.activo === "true") query.activo = true;
  if (filtros.activo === "false") query.activo = false;

  const page = Math.max(1, parseInt(filtros.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filtros.limit) || 10));
  const skip = (page - 1) * limit;

  const [clientes, total] = await Promise.all([
    Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Client.countDocuments(query),
  ]);

  return {
    clientes,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function obtenerPorId(id) {
  const cliente = await Client.findById(id);
  if (!cliente) throw new Error("Cliente no encontrado.");
  return cliente;
}

export async function crear(data) {
  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const existe = await Client.findOne({ rut: data.rut.trim() });
  if (existe) {
    const err = new Error("Ya existe un cliente con ese RUT.");
    err.errores = ["Ya existe un cliente con ese RUT."];
    err.status = 400;
    throw err;
  }

  const cliente = new Client({
    nombre: data.nombre.trim(),
    rut: data.rut.trim(),
    telefono: data.telefono || "",
    email: data.email || "",
    direccion: data.direccion || "",
    comuna: data.comuna || "",
    observaciones: data.observaciones || "",
    activo: data.activo !== undefined ? data.activo : true,
  });

  return await cliente.save();
}

export async function actualizar(id, data) {
  const cliente = await Client.findById(id);
  if (!cliente) throw new Error("Cliente no encontrado.");

  const errores = validar(data);
  if (errores.length > 0) {
    const err = new Error("Datos inválidos.");
    err.errores = errores;
    err.status = 400;
    throw err;
  }

  const rutTrim = data.rut.trim();
  if (rutTrim !== cliente.rut) {
    const existe = await Client.findOne({ rut: rutTrim, _id: { $ne: id } });
    if (existe) {
      const err = new Error("Ya existe otro cliente con ese RUT.");
      err.errores = ["Ya existe otro cliente con ese RUT."];
      err.status = 400;
      throw err;
    }
  }

  Object.assign(cliente, {
    nombre: data.nombre.trim(),
    rut: rutTrim,
    telefono: data.telefono ?? cliente.telefono,
    email: data.email ?? cliente.email,
    direccion: data.direccion ?? cliente.direccion,
    comuna: data.comuna ?? cliente.comuna,
    observaciones: data.observaciones ?? cliente.observaciones,
    activo: data.activo !== undefined ? data.activo : cliente.activo,
  });

  return await cliente.save();
}

export async function eliminar(id) {
  const cliente = await Client.findByIdAndDelete(id);
  if (!cliente) throw new Error("Cliente no encontrado.");
  return cliente;
}

export async function obtenerStats() {
  const total = await Client.countDocuments();
  return { total };
}
