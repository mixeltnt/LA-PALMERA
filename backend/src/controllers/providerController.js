import * as providerService from "../services/providerService.js";

export async function getProviders(req, res) {
  try {
    if (req.query.todas === "true") {
      const proveedores = await providerService.listarTodas();
      return res.json(proveedores);
    }
    const result = await providerService.listar(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener proveedores." });
  }
}

export async function getProviderById(req, res) {
  try {
    const proveedor = await providerService.obtenerPorId(req.params.id);
    res.json(proveedor);
  } catch (error) {
    const status = error.message === "Proveedor no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function createProvider(req, res) {
  try {
    const proveedor = await providerService.crear(req.body);
    res.status(201).json(proveedor);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    res.status(500).json({ mensaje: "Error al crear proveedor." });
  }
}

export async function updateProvider(req, res) {
  try {
    const proveedor = await providerService.actualizar(req.params.id, req.body);
    res.json(proveedor);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Proveedor no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function deleteProvider(req, res) {
  try {
    await providerService.eliminar(req.params.id);
    res.json({ mensaje: "Proveedor eliminado correctamente." });
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: error.message, errores: error.errores });
    }
    const status = error.message === "Proveedor no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function getProviderStats(req, res) {
  try {
    const stats = await providerService.obtenerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener estadísticas." });
  }
}
