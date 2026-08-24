import * as ventaService from "../services/ventaService.js";

export async function getVentas(req, res) {
  try {
    const result = await ventaService.listar(req.query);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor." });
  }
}

export async function getVentaById(req, res) {
  try {
    const venta = await ventaService.obtenerPorId(req.params.id);
    res.json(venta);
  } catch (error) {
    const status = error.message === "Venta no encontrada." ? 404 : 500;
    res.status(status).json({
      mensaje: status === 500 ? "Error interno del servidor." : error.message,
    });
  }
}

export async function createVenta(req, res) {
  try {
    const venta = await ventaService.crear({
      ...req.body,
      usuario: req.usuario._id,
    });
    res.status(201).json(venta);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor." });
  }
}

export async function updateVenta(req, res) {
  try {
    const venta = await ventaService.actualizar(req.params.id, {
      ...req.body,
      usuario: req.usuario._id,
    });
    res.json(venta);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Venta no encontrada." ? 404 : 500;
    res.status(status).json({
      mensaje: status === 500 ? "Error interno del servidor." : error.message,
    });
  }
}

export async function confirmarVenta(req, res) {
  try {
    const venta = await ventaService.confirmar(req.params.id);
    res.json(venta);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Venta no encontrada." ? 404 : 500;
    res.status(status).json({
      mensaje: status === 500 ? "Error interno del servidor." : error.message,
    });
  }
}

export async function anularVenta(req, res) {
  try {
    const venta = await ventaService.anular(req.params.id);
    res.json(venta);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Venta no encontrada." ? 404 : 500;
    res.status(status).json({
      mensaje: status === 500 ? "Error interno del servidor." : error.message,
    });
  }
}

export async function getEstadisticasVentas(req, res) {
  try {
    const estadisticas = await ventaService.obtenerEstadisticas(req.query);
    res.json(estadisticas);
  } catch (error) {
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
}

export async function getProductosMasVendidos(req, res) {
  try {
    const productos = await ventaService.obtenerProductosMasVendidos(
      req.query,
    );
    res.json({ productos });
  } catch (error) {
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
}

export async function getSerieVentas(req, res) {
  try {
    const data = await ventaService.obtenerSerieDiaria(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
}
