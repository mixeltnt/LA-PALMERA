import { categoryRepository } from "../database/repositories/catalogRepository";

export const categoryService = {
  listar: async () => {
    try {
      const cats = await categoryRepository.list();
      const categorias = cats.map((c) => ({
        ...c,
        _id: String(c.id),
      }));
      return { categorias };
    } catch (e) {
      console.error("[categoryService] Error listando categorías en SQLite:", e);
      return { categorias: [] };
    }
  },

  listarTodas: async () => {
    const res = await categoryService.listar();
    return res.categorias || [];
  },

  stats: async () => {
    const cats = await categoryRepository.list();
    return {
      total: cats.length,
      activas: cats.length,
    };
  },

  crear: async (data) => {
    const cat = await categoryRepository.create(data);
    return { categoria: { ...cat, _id: String(cat.id) }, mensaje: "Categoría creada localmente" };
  },

  actualizar: async (id, data) => {
    const cat = await categoryRepository.update(id, data);
    return { categoria: { ...cat, _id: String(cat.id) }, mensaje: "Categoría actualizada localmente" };
  },

  eliminar: async (id) => {
    await categoryRepository.delete(id);
    return { mensaje: "Categoría eliminada" };
  },
};

export default categoryService;
