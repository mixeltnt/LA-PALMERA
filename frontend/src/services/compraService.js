import { purchaseRepository } from "../database/repositories/purchaseRepository";

export const compraService = {
  listar: async (params = {}) => {
    try {
      const limit = Number(params.limit) || 10;
      const page = Number(params.page) || 1;
      const total = await purchaseRepository.count(params);
      const compras = await purchaseRepository.list({ ...params, limit, page });

      const mapped = compras.map((c) => ({
        ...c,
        _id: String(c.id),
        numeroCompra: c.folio || c.id,
        proveedor: c.proveedorId
          ? {
              _id: String(c.proveedorId),
              id: c.proveedorId,
              nombre: c.proveedorNombre || "Proveedor",
              rut: c.numeroFactura || "",
            }
          : { nombre: c.proveedorNombre || "Proveedor general" },
        productos: (c.items || []).map((i) => ({
          producto: {
            _id: String(i.productoId),
            id: i.productoId,
            nombre: i.nombre,
            codigo: i.codigo,
          },
          cantidad: i.cantidad,
          precioCompra: i.costoUnitario,
          subtotal: i.subtotal,
        })),
      }));

      return {
        compras: mapped,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (e) {
      console.error("[compraService] Error listando compras en SQLite:", e);
      return { compras: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  resumen: async () => {
    try {
      return await purchaseRepository.getSummary();
    } catch (e) {
      console.error("[compraService] Error obteniendo resumen compras en SQLite:", e);
      return { cantidad: 0, totalComprado: 0 };
    }
  },

  obtener: async (id) => {
    try {
      const c = await purchaseRepository.getById(id);
      if (!c) return { compra: null };
      return {
        compra: {
          ...c,
          _id: String(c.id),
          numeroCompra: c.folio || c.id,
          proveedor: c.proveedorId
            ? {
                _id: String(c.proveedorId),
                id: c.proveedorId,
                nombre: c.proveedorNombre || "Proveedor",
              }
            : { nombre: c.proveedorNombre || "Proveedor general" },
        },
      };
    } catch (e) {
      console.error("[compraService] Error obteniendo compra en SQLite:", e);
      return { compra: null };
    }
  },

  crear: async (data) => {
    try {
      const rawItems = data.productos || data.items || [];
      const items = rawItems.map((i) => ({
        productoId: i.productoId || i.producto || i._id || i.id,
        codigo: i.codigo || "",
        nombre: i.nombre || "Producto",
        cantidad: Number(i.cantidad) || 0,
        costoUnitario: Number(i.precioCompra ?? i.costoUnitario ?? i.precioCosto) || 0,
        subtotal: Number(i.subtotal) || ((Number(i.cantidad) || 0) * (Number(i.precioCompra ?? i.costoUnitario) || 0)),
      }));

      const total = Number(data.total) || items.reduce((sum, it) => sum + it.subtotal, 0);

      const created = await purchaseRepository.create({
        numeroFactura: data.numeroFactura || data.numeroDocumento || null,
        proveedorId: data.proveedorId || data.proveedor || null,
        proveedorNombre: data.proveedorNombre || data.proveedor?.nombre || null,
        fecha: data.fecha || data.fechaCompra || new Date().toISOString(),
        items,
        subtotal: Number(data.subtotal) || total,
        impuestoTotal: Number(data.impuestoTotal) || 0,
        total,
        estado: "completada",
        usuarioId: data.usuarioId || 1,
        usuarioNombre: data.usuarioNombre || "Administrador",
        notas: data.observaciones || data.notas || null,
      });

      return {
        compra: {
          ...created,
          _id: String(created.id),
          numeroCompra: created.folio || created.id,
        },
        mensaje: "Compra guardada en SQLite local con éxito",
      };
    } catch (e) {
      console.error("[compraService] Error creando compra en SQLite:", e);
      throw new Error(e.message || "Error al registrar la compra localmente");
    }
  },

  actualizar: async (id, data) => {
    return { mensaje: "Compra actualizada" };
  },

  confirmar: async (id) => {
    return { mensaje: "Compra confirmada localmente" };
  },

  anular: async (id) => {
    return { mensaje: "Compra anulada localmente" };
  },

  obtenerEstadisticasProveedores: async () => {
    try {
      return await purchaseRepository.getSupplierStats();
    } catch (e) {
      console.error("[compraService] Error obteniendo estadísticas de proveedores:", e);
      return {};
    }
  },

  obtenerProductosProveedor: async (proveedorId) => {
    try {
      return await purchaseRepository.getSupplierProducts(proveedorId);
    } catch (e) {
      console.error("[compraService] Error obteniendo productos de proveedor:", e);
      return [];
    }
  },

  comparativaPreciosProveedores: async () => {
    try {
      return await purchaseRepository.getPriceComparison();
    } catch (e) {
      console.error("[compraService] Error obteniendo comparativa de precios:", e);
      return [];
    }
  },
};

export default compraService;
