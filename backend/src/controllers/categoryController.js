import * as categoryService from "../services/categoryService.js";

export async function getCategories(req, res) {
  try {
    if (req.query.todas === "true") {
      const categorias = await categoryService.listarTodas();
      return res.json(categorias);
    }
    const result = await categoryService.listar(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener categorías." });
  }
}

export async function getCategoryById(req, res) {
  try {
    const categoria = await categoryService.obtenerPorId(req.params.id);
    res.json(categoria);
  } catch (error) {
    const status = error.message === "Categoría no encontrada." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function createCategory(req, res) {
  try {
    const categoria = await categoryService.crear(req.body);
    res.status(201).json(categoria);
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    res.status(500).json({ mensaje: "Error al crear categoría." });
  }
}

export async function updateCategory(req, res) {
  try {
    const categoria = await categoryService.actualizar(req.params.id, req.body);
    res.json(categoria);
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: "Datos inválidos.", errores: error.errores });
    }
    const status = error.message === "Categoría no encontrada." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    await categoryService.eliminar(req.params.id);
    res.json({ mensaje: "Categoría eliminada correctamente." });
  } catch (error) {
    if (error.errores) {
      return res.status(400).json({ mensaje: error.message, errores: error.errores });
    }
    const status = error.message === "Categoría no encontrada." ? 404 : 500;
    res.status(status).json({ mensaje: error.message });
  }
}

export async function getCategoryStats(req, res) {
  try {
    const stats = await categoryService.obtenerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener estadísticas." });
  }
}
