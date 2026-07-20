import * as compraService from "../services/compraService.js";

export async function getCompras(req, res) {
  try {
    const result = await compraService.listar(req.query);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al obtener compras.", error: error.message });
  }
}

export async function getCompraById(req, res) {
  try {
    const compra = await compraService.obtenerPorId(req.params.id);
    res.json(compra);
  } catch (error) {
    const status = error.message === "Compra no encontrada." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function createCompra(req, res) {
  try {
    const compra = await compraService.crear(req.body);
    res.status(201).json(compra);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    res
      .status(500)
      .json({ mensaje: "Error al crear compra.", error: error.message });
  }
}

export async function updateCompra(req, res) {
  try {
    const compra = await compraService.actualizar(req.params.id, req.body);
    res.json(compra);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Compra no encontrada." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function confirmarCompra(req, res) {
  try {
    const compra = await compraService.confirmar(req.params.id);
    res.json(compra);
  } catch (error) {
    if (error.errores) {
      return res
        .status(400)
        .json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Compra no encontrada." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}
