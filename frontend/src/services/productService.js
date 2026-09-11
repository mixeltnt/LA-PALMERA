import { productRepository } from "../database/repositories/productRepository";

export const productService = {
  listar: async (params = {}) => {
    try {
      const rawList = await productRepository.list({
        search: params.search,
        categoriaId: params.categoria,
        activo: params.activo === "true" ? true : params.activo === "false" ? false : undefined,
      });

      const productos = rawList.map((p) => ({
        ...p,
        _id: String(p.id),
        precioCompra: p.precioCosto || 0,
        precioVenta: p.precioVenta || 0,
        stockActual: p.stockActual ?? 0,
        stockMinimo: p.stockMinimo ?? 5,
        imagen: p.imagenUrl || p.imagen || "",
        imagenUrl: p.imagenUrl || p.imagen || "",
        categoria: p.categoriaNombre ? { _id: String(p.categoriaId), id: p.categoriaId, nombre: p.categoriaNombre } : null,
        proveedorPrincipal: p.proveedorNombre ? { _id: String(p.proveedorId), id: p.proveedorId, nombre: p.proveedorNombre } : null,
      }));

      const limit = Number(params.limit) || 10;
      return {
        productos,
        total: productos.length,
        page: Number(params.page) || 1,
        totalPages: Math.max(1, Math.ceil(productos.length / limit)),
      };
    } catch (e) {
      console.error("[productService] Error listando productos en SQLite:", e);
      return { productos: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  obtener: async (id) => {
    const p = await productRepository.getById(id);
    if (!p) return { producto: null };
    return {
      producto: {
        ...p,
        _id: String(p.id),
        precioCompra: p.precioCosto || 0,
        precioVenta: p.precioVenta || 0,
        stockActual: p.stockActual ?? 0,
        stockMinimo: p.stockMinimo ?? 5,
        imagen: p.imagenUrl || p.imagen || "",
        imagenUrl: p.imagenUrl || p.imagen || "",
        categoria: p.categoriaNombre ? { _id: String(p.categoriaId), id: p.categoriaId, nombre: p.categoriaNombre } : null,
        proveedorPrincipal: p.proveedorNombre ? { _id: String(p.proveedorId), id: p.proveedorId, nombre: p.proveedorNombre } : null,
      },
    };
  },

  buscarPorCodigo: async (codigo) => {
    const clean = String(codigo || "").trim();
    if (!clean) return null;
    const p = await productRepository.getByCode(clean);
    if (!p) return null;
    return {
      ...p,
      _id: String(p.id),
      precioCompra: p.precioCosto || 0,
      precioVenta: p.precioVenta || 0,
      stockActual: p.stockActual ?? 0,
      stockMinimo: p.stockMinimo ?? 5,
      imagen: p.imagenUrl || p.imagen || "",
      imagenUrl: p.imagenUrl || p.imagen || "",
      categoria: p.categoriaNombre ? { _id: String(p.categoriaId), id: p.categoriaId, nombre: p.categoriaNombre } : null,
      proveedorPrincipal: p.proveedorNombre ? { _id: String(p.proveedorId), id: p.proveedorId, nombre: p.proveedorNombre } : null,
    };
  },

  crear: async (data) => {
    const img = data.imagenUrl || data.imagen || null;
    const catId = data.categoriaId ?? data.categoria ?? null;
    const provId = data.proveedorId ?? data.proveedorPrincipal ?? null;

    const created = await productRepository.create({
      ...data,
      categoriaId: catId,
      proveedorId: provId,
      imagenUrl: img,
      precioCosto: Number(data.precioCompra ?? data.precioCosto) || 0,
      precioVenta: Number(data.precioVenta) || 0,
      stockActual: Number(data.stockActual ?? data.stock) || 0,
      stockMinimo: Number(data.stockMinimo) || 5,
      activo: data.activo !== false,
    });
    return {
      producto: {
        ...created,
        _id: String(created.id),
        precioCompra: created.precioCosto,
        precioVenta: created.precioVenta,
        imagen: created.imagenUrl || "",
        imagenUrl: created.imagenUrl || "",
        categoria: created.categoriaNombre ? { _id: String(created.categoriaId), id: created.categoriaId, nombre: created.categoriaNombre } : null,
        proveedorPrincipal: created.proveedorNombre ? { _id: String(created.proveedorId), id: created.proveedorId, nombre: created.proveedorNombre } : null,
      },
      mensaje: "Producto guardado localmente",
    };
  },

  actualizar: async (id, data) => {
    const img = data.imagenUrl !== undefined ? data.imagenUrl : data.imagen;
    const catId = data.categoriaId !== undefined ? data.categoriaId : (data.categoria !== undefined ? data.categoria : undefined);
    const provId = data.proveedorId !== undefined ? data.proveedorId : (data.proveedorPrincipal !== undefined ? data.proveedorPrincipal : undefined);

    const updated = await productRepository.update(id, {
      ...data,
      categoriaId: catId,
      proveedorId: provId,
      imagenUrl: img,
      precioCosto: data.precioCompra !== undefined ? Number(data.precioCompra) : undefined,
      precioVenta: data.precioVenta !== undefined ? Number(data.precioVenta) : undefined,
      stockActual: data.stockActual !== undefined ? Number(data.stockActual) : undefined,
      stockMinimo: data.stockMinimo !== undefined ? Number(data.stockMinimo) : undefined,
      activo: data.activo !== undefined ? Boolean(data.activo) : undefined,
    });
    return {
      producto: {
        ...updated,
        _id: String(updated.id),
        precioCompra: updated.precioCosto,
        precioVenta: updated.precioVenta,
        imagen: updated.imagenUrl || "",
        imagenUrl: updated.imagenUrl || "",
        categoria: updated.categoriaNombre ? { _id: String(updated.categoriaId), id: updated.categoriaId, nombre: updated.categoriaNombre } : null,
        proveedorPrincipal: updated.proveedorNombre ? { _id: String(updated.proveedorId), id: updated.proveedorId, nombre: updated.proveedorNombre } : null,
      },
      mensaje: "Producto actualizado localmente",
    };
  },

  eliminar: async (id) => {
    await productRepository.delete(id);
    return { mensaje: "Producto eliminado localmente" };
  },

  eliminarVarios: async (ids) => {
    const total = await productRepository.deleteMany(ids);
    return { mensaje: `${total} productos eliminados correctamente`, eliminados: total };
  },

  stats: async () => {
    const s = await productRepository.getStats();
    return {
      total: s.total,
      activos: s.total,
      inactivos: 0,
      stockBajo: s.lowStock,
      sinStock: s.outOfStock,
      valorTotal: s.totalValue,
    };
  },

  kardex: async (params = {}) => {
    try {
      const movimientos = await productRepository.getKardex(params);
      return { movimientos };
    } catch (e) {
      console.error("[productService] Error consultando Kardex:", e);
      return { movimientos: [] };
    }
  },
};

export default productService;
