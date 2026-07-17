import * as clientService from "../services/clientService.js";

export async function getClients(req, res) {
  try {
    const result = await clientService.listar(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener clientes." });
  }
}

export async function getClientById(req, res) {
  try {
    const cliente = await clientService.obtenerPorId(req.params.id);
    res.json(cliente);
  } catch (error) {
    const status = error.message === "Cliente no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function createClient(req, res) {
  try {
    const cliente = await clientService.crear(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    res.status(500).json({ mensaje: "Error al crear cliente." });
  }
}

export async function updateClient(req, res) {
  try {
    const cliente = await clientService.actualizar(req.params.id, req.body);
    res.json(cliente);
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Cliente no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function deleteClient(req, res) {
  try {
    await clientService.eliminar(req.params.id);
    res.json({ mensaje: "Cliente eliminado correctamente." });
  } catch (error) {
    const status = error.message === "Cliente no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function getClientStats(req, res) {
  try {
    const stats = await clientService.obtenerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener estadísticas." });
  }
}
