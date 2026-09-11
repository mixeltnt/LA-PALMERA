import { supplierRepository } from "../database/repositories/catalogRepository";

export const providerService = {
  listar: async (params = {}) => {
    try {
      const rawList = await supplierRepository.list(params.search, params.activo);
      const proveedores = rawList.map((p) => ({
        ...p,
        _id: String(p.id),
      }));
      return {
        proveedores,
        total: proveedores.length,
        page: 1,
        totalPages: 1,
      };
    } catch (e) {
      console.error("[providerService] Error listando proveedores en SQLite:", e);
      return { proveedores: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  listarTodas: async () => {
    const res = await providerService.listar();
    return res.proveedores || [];
  },

  obtener: async (id) => {
    try {
      const p = await supplierRepository.getById(id);
      return { proveedor: p ? { ...p, _id: String(p.id) } : null };
    } catch {
      return { proveedor: null };
    }
  },

  crear: async (data) => {
    const p = await supplierRepository.create(data);
    return { proveedor: { ...p, _id: String(p.id) }, mensaje: "Proveedor creado localmente" };
  },

  actualizar: async (id, data) => {
    const p = await supplierRepository.update(id, data);
    return { proveedor: { ...p, _id: String(p.id) }, mensaje: "Proveedor actualizado localmente" };
  },

  eliminar: async (id) => {
    await supplierRepository.delete(id);
    return { mensaje: "Proveedor eliminado correctamente" };
  },
};

export default providerService;
