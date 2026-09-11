import { saleRepository } from "../database/repositories/saleRepository";

export const ventaService = {
  crear: async (data) => {
    const rawItems = data.productos || data.items || [];
    const items = rawItems.map((i) => ({
      productoId: i.productoId || i.producto || i._id || i.id || 1,
      codigo: i.codigo || "",
      nombre: i.nombre || "Producto",
      cantidad: Number(i.cantidad) || 1,
      precioUnitario: Number(i.precioUnitario || i.precio) || 0,
      costoUnitario: Number(i.precioCosto || i.costoUnitario) || 0,
      descuento: Number(i.descuento) || 0,
      subtotal: Number(i.subtotal) || ((Number(i.cantidad) || 1) * (Number(i.precioUnitario || i.precio) || 0)),
    }));

    const total = Number(data.total) || items.reduce((s, it) => s + it.subtotal, 0);

    const nuevaVenta = await saleRepository.create({
      fecha: data.fecha || new Date().toISOString(),
      cajeroId: data.cajeroId || 1,
      cajeroNombre: data.cajeroNombre || "Cajero",
      clienteId: data.clienteId || (data.cliente && String(data.cliente).trim() !== "" ? data.cliente : null),
      clienteNombre: data.clienteNombre || null,
      subtotal: Number(data.subtotal) || total,
      descuentoTotal: Number(data.descuento || data.descuentoTotal) || 0,
      impuestoTotal: 0,
      total,
      montoRecibido: Number(data.montoRecibido) || total,
      vuelto: Number(data.vuelto) || 0,
      metodoPagoPrincipal: (data.metodoPago || data.metodoPagoPrincipal || "efectivo").toLowerCase(),
      estado: "completada",
      items,
      pagos: [
        {
          metodo: (data.metodoPago || data.metodoPagoPrincipal || "efectivo").toLowerCase(),
          monto: total,
        },
      ],
      notas: data.observaciones || data.notas || null,
    });

    const formatted = {
      ...nuevaVenta,
      _id: String(nuevaVenta.id),
      id: nuevaVenta.id,
      numeroVenta: nuevaVenta.folio || nuevaVenta.id,
    };

    return {
      ...formatted,
      _id: String(nuevaVenta.id),
      id: nuevaVenta.id,
      numeroVenta: nuevaVenta.folio || nuevaVenta.id,
      venta: formatted,
      mensaje: `Venta #${nuevaVenta?.folio || nuevaVenta?.id || 1} confirmada localmente por $${(Number(nuevaVenta?.total ?? total) || 0).toLocaleString("es-CL")}.`,
    };
  },

  actualizar: async (id, data) => {
    return { mensaje: "Venta actualizada localmente" };
  },

  confirmar: async (id) => {
    return { ok: true, mensaje: "Venta confirmada localmente" };
  },

  listar: async (params = {}) => {
    try {
      const total = await saleRepository.count(params);
      const limit = Number(params.limit) || 10;
      const page = Number(params.page) || 1;
      const rawSales = await saleRepository.list({ ...params, limit, page });
      const ventas = rawSales.map((v) => ({
        ...v,
        _id: String(v.id),
        numeroVenta: v.folio || v.id,
        metodoPago: (v.metodoPagoPrincipal || "efectivo").toUpperCase(),
      }));
      return {
        ventas,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (e) {
      console.error("[Ventas] Error listando ventas en SQLite:", e);
      return { ventas: [], total: 0, page: 1, totalPages: 1 };
    }
  },

  obtenerPorId: async (id) => {
    const venta = await saleRepository.getById(id);
    if (!venta) return { venta: null, detalles: [] };

    const rawItems = venta.items || [];
    const detalles = rawItems.map((item, idx) => {
      const prodNombre = item.nombre || "Producto";
      const prodCodigo = item.codigo || "";
      const cant = Number(item.cantidad) || 1;
      const precio = Number(item.precioUnitario ?? 0);
      const desc = Number(item.descuento ?? 0);
      const sub = Number(item.subtotal ?? (cant * precio - desc));

      return {
        _id: String(item.id || idx + 1),
        id: item.id || idx + 1,
        productoId: item.productoId,
        producto: {
          _id: String(item.productoId),
          nombre: prodNombre,
          codigo: prodCodigo,
        },
        codigo: prodCodigo,
        nombre: prodNombre,
        cantidad: cant,
        precioUnitario: precio,
        descuento: desc,
        subtotal: sub,
      };
    });

    return {
      venta: {
        ...venta,
        _id: String(venta.id),
        id: venta.id,
        numeroVenta: venta.folio || venta.id,
        cliente: venta.cliente || (venta.clienteNombre ? { nombre: venta.clienteNombre } : null),
        metodoPago: (venta.metodoPago || venta.metodoPagoPrincipal || "efectivo").toUpperCase(),
        items: detalles,
      },
      detalles,
    };
  },

  obtener: async (id) => {
    return await ventaService.obtenerPorId(id);
  },

  anular: async (id, motivo = "Anulada por usuario") => {
    await saleRepository.anular(id, motivo);
    return { mensaje: "Venta anulada correctamente y stock devuelto a inventario." };
  },

  stats: async () => {
    return await saleRepository.getStatsToday();
  },

  estadisticas: async (params = {}) => {
    try {
      const s = await saleRepository.getStats({
        fechaDesde: params.desde || params.fechaDesde,
        fechaHasta: params.hasta || params.fechaHasta,
        metodoPago: params.metodoPago,
      });
      const porMetodoPago = await saleRepository.getPaymentBreakdown({
        fechaDesde: params.desde || params.fechaDesde,
        fechaHasta: params.hasta || params.fechaHasta,
        metodoPago: params.metodoPago,
      });

      return {
        resumen: {
          totalMonto: s.montoTotal || 0,
          totalVendido: s.montoTotal || 0,
          totalVentas: s.totalVentas || 0,
          ventasAnuladas: s.ventasAnuladas || 0,
          ticketPromedio: s.totalVentas > 0 ? Math.round(s.montoTotal / s.totalVentas) : 0,
          totalEfectivo: s.totalEfectivo || 0,
          totalDebito: s.totalDebito || 0,
          totalTransferencia: s.totalTransferencia || 0,
          totalFiado: s.totalFiado || 0,
          costoTotal: s.costoTotal || 0,
          utilidadTotal: s.utilidadTotal || 0,
          margenPorcentaje: s.margenPorcentaje || 0,
        },
        porMetodoPago,
      };
    } catch (e) {
      console.error("[ventaService] Error en estadisticas:", e);
      return {
        resumen: {
          totalMonto: 0,
          totalVendido: 0,
          totalVentas: 0,
          ventasAnuladas: 0,
          ticketPromedio: 0,
          totalEfectivo: 0,
          totalDebito: 0,
          totalTransferencia: 0,
          totalFiado: 0,
          costoTotal: 0,
          utilidadTotal: 0,
          margenPorcentaje: 0,
        },
        porMetodoPago: [],
      };
    }
  },

  productosMasVendidos: async (params = {}) => {
    try {
      const productos = await saleRepository.getTopProducts(
        Number(params.limit) || 5,
        params.desde || params.fechaDesde,
        params.hasta || params.fechaHasta
      );
      return { productos };
    } catch (e) {
      console.error("[ventaService] Error obteniendo productos más vendidos:", e);
      return { productos: [] };
    }
  },

  serie: async (params = {}) => {
    try {
      const serie = await saleRepository.getSalesSeries(Number(params.dias) || 7);
      return { serie, puntos: serie };
    } catch (e) {
      console.error("[ventaService] Error obteniendo serie de ventas:", e);
      return { serie: [], puntos: [] };
    }
  },
};

export default ventaService;
