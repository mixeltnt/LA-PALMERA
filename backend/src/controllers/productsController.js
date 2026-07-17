import * as productService from "../services/productService.js";

export async function getProducts(req, res) {
  try {
    const result = await productService.listar(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener productos." });
  }
}

export async function getProductById(req, res) {
  try {
    const producto = await productService.obtenerPorId(req.params.id);
    res.json(producto);
  } catch (error) {
    const status = error.message === "Producto no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function createProduct(req, res) {
  try {
    const producto = await productService.crear(req.body);
    res.status(201).json(producto);
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    res.status(500).json({ mensaje: "Error al crear producto." });
  }
}

export async function updateProduct(req, res) {
  try {
    const producto = await productService.actualizar(req.params.id, req.body);
    res.json(producto);
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Producto no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    await productService.eliminar(req.params.id);
    res.json({ mensaje: "Producto eliminado correctamente." });
  } catch (error) {
    const status = error.message === "Producto no encontrado." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function getProductStats(req, res) {
  try {
    const stats = await productService.obtenerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener estadísticas." });
  }
}
